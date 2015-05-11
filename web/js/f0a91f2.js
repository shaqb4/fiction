// Released under MIT license
// Copyright (c) 2009-2010 Dominic Baggott
// Copyright (c) 2009-2010 Ash Berlin
// Copyright (c) 2011 Christoph Dorn <christoph@christophdorn.com> (http://www.christophdorn.com)

(function( expose ) {

    /**
     *  class Markdown
     *
     *  Markdown processing in Javascript done right. We have very particular views
     *  on what constitutes 'right' which include:
     *
     *  - produces well-formed HTML (this means that em and strong nesting is
     *    important)
     *
     *  - has an intermediate representation to allow processing of parsed data (We
     *    in fact have two, both as [JsonML]: a markdown tree and an HTML tree).
     *
     *  - is easily extensible to add new dialects without having to rewrite the
     *    entire parsing mechanics
     *
     *  - has a good test suite
     *
     *  This implementation fulfills all of these (except that the test suite could
     *  do with expanding to automatically run all the fixtures from other Markdown
     *  implementations.)
     *
     *  ##### Intermediate Representation
     *
     *  *TODO* Talk about this :) Its JsonML, but document the node names we use.
     *
     *  [JsonML]: http://jsonml.org/ "JSON Markup Language"
     **/
    var Markdown = expose.Markdown = function Markdown(dialect) {
        switch (typeof dialect) {
            case "undefined":
                this.dialect = Markdown.dialects.Gruber;
                break;
            case "object":
                this.dialect = dialect;
                break;
            default:
                if (dialect in Markdown.dialects) {
                    this.dialect = Markdown.dialects[dialect];
                }
                else {
                    throw new Error("Unknown Markdown dialect '" + String(dialect) + "'");
                }
                break;
        }
        this.em_state = [];
        this.strong_state = [];
        this.debug_indent = "";
    };

    /**
     *  parse( markdown, [dialect] ) -> JsonML
     *  - markdown (String): markdown string to parse
     *  - dialect (String | Dialect): the dialect to use, defaults to gruber
     *
     *  Parse `markdown` and return a markdown document as a Markdown.JsonML tree.
     **/
    expose.parse = function( source, dialect ) {
        // dialect will default if undefined
        var md = new Markdown( dialect );
        return md.toTree( source );
    };

    /**
     *  toHTML( markdown, [dialect]  ) -> String
     *  toHTML( md_tree ) -> String
     *  - markdown (String): markdown string to parse
     *  - md_tree (Markdown.JsonML): parsed markdown tree
     *
     *  Take markdown (either as a string or as a JsonML tree) and run it through
     *  [[toHTMLTree]] then turn it into a well-formated HTML fragment.
     **/
    expose.toHTML = function toHTML( source , dialect , options ) {
        var input = expose.toHTMLTree( source , dialect , options );

        return expose.renderJsonML( input );
    };

    /**
     *  toHTMLTree( markdown, [dialect] ) -> JsonML
     *  toHTMLTree( md_tree ) -> JsonML
     *  - markdown (String): markdown string to parse
     *  - dialect (String | Dialect): the dialect to use, defaults to gruber
     *  - md_tree (Markdown.JsonML): parsed markdown tree
     *
     *  Turn markdown into HTML, represented as a JsonML tree. If a string is given
     *  to this function, it is first parsed into a markdown tree by calling
     *  [[parse]].
     **/
    expose.toHTMLTree = function toHTMLTree( input, dialect , options ) {
        // convert string input to an MD tree
        if ( typeof input ==="string" ) input = this.parse( input, dialect );

        // Now convert the MD tree to an HTML tree

        // remove references from the tree
        var attrs = extract_attr( input ),
            refs = {};

        if ( attrs && attrs.references ) {
            refs = attrs.references;
        }

        var html = convert_tree_to_html( input, refs , options );
        merge_text_nodes( html );
        return html;
    };

// For Spidermonkey based engines
    function mk_block_toSource() {
        return "Markdown.mk_block( " +
            uneval(this.toString()) +
            ", " +
            uneval(this.trailing) +
            ", " +
            uneval(this.lineNumber) +
            " )";
    }

// node
    function mk_block_inspect() {
        var util = require('util');
        return "Markdown.mk_block( " +
            util.inspect(this.toString()) +
            ", " +
            util.inspect(this.trailing) +
            ", " +
            util.inspect(this.lineNumber) +
            " )";

    }

    var mk_block = Markdown.mk_block = function(block, trail, line) {
        // Be helpful for default case in tests.
        if ( arguments.length == 1 ) trail = "\n\n";

        var s = new String(block);
        s.trailing = trail;
        // To make it clear its not just a string
        s.inspect = mk_block_inspect;
        s.toSource = mk_block_toSource;

        if (line != undefined)
            s.lineNumber = line;

        return s;
    };

    function count_lines( str ) {
        var n = 0, i = -1;
        while ( ( i = str.indexOf('\n', i+1) ) !== -1) n++;
        return n;
    }

// Internal - split source into rough blocks
    Markdown.prototype.split_blocks = function splitBlocks( input, startLine ) {
        // [\s\S] matches _anything_ (newline or space)
        var re = /([\s\S]+?)($|\n(?:\s*\n|$)+)/g,
            blocks = [],
            m;

        var line_no = 1;

        if ( ( m = /^(\s*\n)/.exec(input) ) != null ) {
            // skip (but count) leading blank lines
            line_no += count_lines( m[0] );
            re.lastIndex = m[0].length;
        }

        while ( ( m = re.exec(input) ) !== null ) {
            blocks.push( mk_block( m[1], m[2], line_no ) );
            line_no += count_lines( m[0] );
        }

        return blocks;
    };

    /**
     *  Markdown#processBlock( block, next ) -> undefined | [ JsonML, ... ]
     *  - block (String): the block to process
     *  - next (Array): the following blocks
     *
     * Process `block` and return an array of JsonML nodes representing `block`.
     *
     * It does this by asking each block level function in the dialect to process
     * the block until one can. Succesful handling is indicated by returning an
     * array (with zero or more JsonML nodes), failure by a false value.
     *
     * Blocks handlers are responsible for calling [[Markdown#processInline]]
     * themselves as appropriate.
     *
     * If the blocks were split incorrectly or adjacent blocks need collapsing you
     * can adjust `next` in place using shift/splice etc.
     *
     * If any of this default behaviour is not right for the dialect, you can
     * define a `__call__` method on the dialect that will get invoked to handle
     * the block processing.
     */
    Markdown.prototype.processBlock = function processBlock( block, next ) {
        var cbs = this.dialect.block,
            ord = cbs.__order__;

        if ( "__call__" in cbs ) {
            return cbs.__call__.call(this, block, next);
        }

        for ( var i = 0; i < ord.length; i++ ) {
            //D:this.debug( "Testing", ord[i] );
            var res = cbs[ ord[i] ].call( this, block, next );
            if ( res ) {
                //D:this.debug("  matched");
                if ( !isArray(res) || ( res.length > 0 && !( isArray(res[0]) ) ) )
                    this.debug(ord[i], "didn't return a proper array");
                //D:this.debug( "" );
                return res;
            }
        }

        // Uhoh! no match! Should we throw an error?
        return [];
    };

    Markdown.prototype.processInline = function processInline( block ) {
        return this.dialect.inline.__call__.call( this, String( block ) );
    };

    /**
     *  Markdown#toTree( source ) -> JsonML
     *  - source (String): markdown source to parse
     *
     *  Parse `source` into a JsonML tree representing the markdown document.
     **/
// custom_tree means set this.tree to `custom_tree` and restore old value on return
    Markdown.prototype.toTree = function toTree( source, custom_root ) {
        var blocks = source instanceof Array ? source : this.split_blocks( source );

        // Make tree a member variable so its easier to mess with in extensions
        var old_tree = this.tree;
        try {
            this.tree = custom_root || this.tree || [ "markdown" ];

            blocks:
                while ( blocks.length ) {
                    var b = this.processBlock( blocks.shift(), blocks );

                    // Reference blocks and the like won't return any content
                    if ( !b.length ) continue blocks;

                    this.tree.push.apply( this.tree, b );
                }
            return this.tree;
        }
        finally {
            if ( custom_root ) {
                this.tree = old_tree;
            }
        }
    };

// Noop by default
    Markdown.prototype.debug = function () {
        var args = Array.prototype.slice.call( arguments);
        args.unshift(this.debug_indent);
        if (typeof print !== "undefined")
            print.apply( print, args );
        if (typeof console !== "undefined" && typeof console.log !== "undefined")
            console.log.apply( null, args );
    }

    Markdown.prototype.loop_re_over_block = function( re, block, cb ) {
        // Dont use /g regexps with this
        var m,
            b = block.valueOf();

        while ( b.length && (m = re.exec(b) ) != null) {
            b = b.substr( m[0].length );
            cb.call(this, m);
        }
        return b;
    };

    /**
     * Markdown.dialects
     *
     * Namespace of built-in dialects.
     **/
    Markdown.dialects = {};

    /**
     * Markdown.dialects.Gruber
     *
     * The default dialect that follows the rules set out by John Gruber's
     * markdown.pl as closely as possible. Well actually we follow the behaviour of
     * that script which in some places is not exactly what the syntax web page
     * says.
     **/
    Markdown.dialects.Gruber = {
        block: {
            atxHeader: function atxHeader( block, next ) {
                var m = block.match( /^(#{1,6})\s*(.*?)\s*#*\s*(?:\n|$)/ );

                if ( !m ) return undefined;

                var header = [ "header", { level: m[ 1 ].length } ];
                Array.prototype.push.apply(header, this.processInline(m[ 2 ]));

                if ( m[0].length < block.length )
                    next.unshift( mk_block( block.substr( m[0].length ), block.trailing, block.lineNumber + 2 ) );

                return [ header ];
            },

            setextHeader: function setextHeader( block, next ) {
                var m = block.match( /^(.*)\n([-=])\2\2+(?:\n|$)/ );

                if ( !m ) return undefined;

                var level = ( m[ 2 ] === "=" ) ? 1 : 2;
                var header = [ "header", { level : level }, m[ 1 ] ];

                if ( m[0].length < block.length )
                    next.unshift( mk_block( block.substr( m[0].length ), block.trailing, block.lineNumber + 2 ) );

                return [ header ];
            },

            code: function code( block, next ) {
                // |    Foo
                // |bar
                // should be a code block followed by a paragraph. Fun
                //
                // There might also be adjacent code block to merge.

                var ret = [],
                    re = /^(?: {0,3}\t| {4})(.*)\n?/,
                    lines;

                // 4 spaces + content
                if ( !block.match( re ) ) return undefined;

                block_search:
                    do {
                        // Now pull out the rest of the lines
                        var b = this.loop_re_over_block(
                            re, block.valueOf(), function( m ) { ret.push( m[1] ); } );

                        if (b.length) {
                            // Case alluded to in first comment. push it back on as a new block
                            next.unshift( mk_block(b, block.trailing) );
                            break block_search;
                        }
                        else if (next.length) {
                            // Check the next block - it might be code too
                            if ( !next[0].match( re ) ) break block_search;

                            // Pull how how many blanks lines follow - minus two to account for .join
                            ret.push ( block.trailing.replace(/[^\n]/g, '').substring(2) );

                            block = next.shift();
                        }
                        else {
                            break block_search;
                        }
                    } while (true);

                return [ [ "code_block", ret.join("\n") ] ];
            },

            horizRule: function horizRule( block, next ) {
                // this needs to find any hr in the block to handle abutting blocks
                var m = block.match( /^(?:([\s\S]*?)\n)?[ \t]*([-_*])(?:[ \t]*\2){2,}[ \t]*(?:\n([\s\S]*))?$/ );

                if ( !m ) {
                    return undefined;
                }

                var jsonml = [ [ "hr" ] ];

                // if there's a leading abutting block, process it
                if ( m[ 1 ] ) {
                    jsonml.unshift.apply( jsonml, this.processBlock( m[ 1 ], [] ) );
                }

                // if there's a trailing abutting block, stick it into next
                if ( m[ 3 ] ) {
                    next.unshift( mk_block( m[ 3 ] ) );
                }

                return jsonml;
            },

            // There are two types of lists. Tight and loose. Tight lists have no whitespace
            // between the items (and result in text just in the <li>) and loose lists,
            // which have an empty line between list items, resulting in (one or more)
            // paragraphs inside the <li>.
            //
            // There are all sorts weird edge cases about the original markdown.pl's
            // handling of lists:
            //
            // * Nested lists are supposed to be indented by four chars per level. But
            //   if they aren't, you can get a nested list by indenting by less than
            //   four so long as the indent doesn't match an indent of an existing list
            //   item in the 'nest stack'.
            //
            // * The type of the list (bullet or number) is controlled just by the
            //    first item at the indent. Subsequent changes are ignored unless they
            //    are for nested lists
            //
            lists: (function( ) {
                // Use a closure to hide a few variables.
                var any_list = "[*+-]|\\d+\\.",
                    bullet_list = /[*+-]/,
                    number_list = /\d+\./,
                // Capture leading indent as it matters for determining nested lists.
                    is_list_re = new RegExp( "^( {0,3})(" + any_list + ")[ \t]+" ),
                    indent_re = "(?: {0,3}\\t| {4})";

                // TODO: Cache this regexp for certain depths.
                // Create a regexp suitable for matching an li for a given stack depth
                function regex_for_depth( depth ) {

                    return new RegExp(
                        // m[1] = indent, m[2] = list_type
                        "(?:^(" + indent_re + "{0," + depth + "} {0,3})(" + any_list + ")\\s+)|" +
                            // m[3] = cont
                            "(^" + indent_re + "{0," + (depth-1) + "}[ ]{0,4})"
                    );
                }
                function expand_tab( input ) {
                    return input.replace( / {0,3}\t/g, "    " );
                }

                // Add inline content `inline` to `li`. inline comes from processInline
                // so is an array of content
                function add(li, loose, inline, nl) {
                    if (loose) {
                        li.push( [ "para" ].concat(inline) );
                        return;
                    }
                    // Hmmm, should this be any block level element or just paras?
                    var add_to = li[li.length -1] instanceof Array && li[li.length - 1][0] == "para"
                        ? li[li.length -1]
                        : li;

                    // If there is already some content in this list, add the new line in
                    if (nl && li.length > 1) inline.unshift(nl);

                    for (var i=0; i < inline.length; i++) {
                        var what = inline[i],
                            is_str = typeof what == "string";
                        if (is_str && add_to.length > 1 && typeof add_to[add_to.length-1] == "string" ) {
                            add_to[ add_to.length-1 ] += what;
                        }
                        else {
                            add_to.push( what );
                        }
                    }
                }

                // contained means have an indent greater than the current one. On
                // *every* line in the block
                function get_contained_blocks( depth, blocks ) {

                    var re = new RegExp( "^(" + indent_re + "{" + depth + "}.*?\\n?)*$" ),
                        replace = new RegExp("^" + indent_re + "{" + depth + "}", "gm"),
                        ret = [];

                    while ( blocks.length > 0 ) {
                        if ( re.exec( blocks[0] ) ) {
                            var b = blocks.shift(),
                            // Now remove that indent
                                x = b.replace( replace, "");

                            ret.push( mk_block( x, b.trailing, b.lineNumber ) );
                        }
                        break;
                    }
                    return ret;
                }

                // passed to stack.forEach to turn list items up the stack into paras
                function paragraphify(s, i, stack) {
                    var list = s.list;
                    var last_li = list[list.length-1];

                    if (last_li[1] instanceof Array && last_li[1][0] == "para") {
                        return;
                    }
                    if (i+1 == stack.length) {
                        // Last stack frame
                        // Keep the same array, but replace the contents
                        last_li.push( ["para"].concat( last_li.splice(1) ) );
                    }
                    else {
                        var sublist = last_li.pop();
                        last_li.push( ["para"].concat( last_li.splice(1) ), sublist );
                    }
                }

                // The matcher function
                return function( block, next ) {
                    var m = block.match( is_list_re );
                    if ( !m ) return undefined;

                    function make_list( m ) {
                        var list = bullet_list.exec( m[2] )
                            ? ["bulletlist"]
                            : ["numberlist"];

                        stack.push( { list: list, indent: m[1] } );
                        return list;
                    }


                    var stack = [], // Stack of lists for nesting.
                        list = make_list( m ),
                        last_li,
                        loose = false,
                        ret = [ stack[0].list ],
                        i;

                    // Loop to search over block looking for inner block elements and loose lists
                    loose_search:
                        while( true ) {
                            // Split into lines preserving new lines at end of line
                            var lines = block.split( /(?=\n)/ );

                            // We have to grab all lines for a li and call processInline on them
                            // once as there are some inline things that can span lines.
                            var li_accumulate = "";

                            // Loop over the lines in this block looking for tight lists.
                            tight_search:
                                for (var line_no=0; line_no < lines.length; line_no++) {
                                    var nl = "",
                                        l = lines[line_no].replace(/^\n/, function(n) { nl = n; return ""; });

                                    // TODO: really should cache this
                                    var line_re = regex_for_depth( stack.length );

                                    m = l.match( line_re );
                                    //print( "line:", uneval(l), "\nline match:", uneval(m) );

                                    // We have a list item
                                    if ( m[1] !== undefined ) {
                                        // Process the previous list item, if any
                                        if ( li_accumulate.length ) {
                                            add( last_li, loose, this.processInline( li_accumulate ), nl );
                                            // Loose mode will have been dealt with. Reset it
                                            loose = false;
                                            li_accumulate = "";
                                        }

                                        m[1] = expand_tab( m[1] );
                                        var wanted_depth = Math.floor(m[1].length/4)+1;
                                        //print( "want:", wanted_depth, "stack:", stack.length);
                                        if ( wanted_depth > stack.length ) {
                                            // Deep enough for a nested list outright
                                            //print ( "new nested list" );
                                            list = make_list( m );
                                            last_li.push( list );
                                            last_li = list[1] = [ "listitem" ];
                                        }
                                        else {
                                            // We aren't deep enough to be strictly a new level. This is
                                            // where Md.pl goes nuts. If the indent matches a level in the
                                            // stack, put it there, else put it one deeper then the
                                            // wanted_depth deserves.
                                            var found = false;
                                            for (i = 0; i < stack.length; i++) {
                                                if ( stack[ i ].indent != m[1] ) continue;
                                                list = stack[ i ].list;
                                                stack.splice( i+1 );
                                                found = true;
                                                break;
                                            }

                                            if (!found) {
                                                //print("not found. l:", uneval(l));
                                                wanted_depth++;
                                                if (wanted_depth <= stack.length) {
                                                    stack.splice(wanted_depth);
                                                    //print("Desired depth now", wanted_depth, "stack:", stack.length);
                                                    list = stack[wanted_depth-1].list;
                                                    //print("list:", uneval(list) );
                                                }
                                                else {
                                                    //print ("made new stack for messy indent");
                                                    list = make_list(m);
                                                    last_li.push(list);
                                                }
                                            }

                                            //print( uneval(list), "last", list === stack[stack.length-1].list );
                                            last_li = [ "listitem" ];
                                            list.push(last_li);
                                        } // end depth of shenegains
                                        nl = "";
                                    }

                                    // Add content
                                    if (l.length > m[0].length) {
                                        li_accumulate += nl + l.substr( m[0].length );
                                    }
                                } // tight_search

                            if ( li_accumulate.length ) {
                                add( last_li, loose, this.processInline( li_accumulate ), nl );
                                // Loose mode will have been dealt with. Reset it
                                loose = false;
                                li_accumulate = "";
                            }

                            // Look at the next block - we might have a loose list. Or an extra
                            // paragraph for the current li
                            var contained = get_contained_blocks( stack.length, next );

                            // Deal with code blocks or properly nested lists
                            if (contained.length > 0) {
                                // Make sure all listitems up the stack are paragraphs
                                forEach( stack, paragraphify, this);

                                last_li.push.apply( last_li, this.toTree( contained, [] ) );
                            }

                            var next_block = next[0] && next[0].valueOf() || "";

                            if ( next_block.match(is_list_re) || next_block.match( /^ / ) ) {
                                block = next.shift();

                                // Check for an HR following a list: features/lists/hr_abutting
                                var hr = this.dialect.block.horizRule( block, next );

                                if (hr) {
                                    ret.push.apply(ret, hr);
                                    break;
                                }

                                // Make sure all listitems up the stack are paragraphs
                                forEach( stack, paragraphify, this);

                                loose = true;
                                continue loose_search;
                            }
                            break;
                        } // loose_search

                    return ret;
                };
            })(),

            blockquote: function blockquote( block, next ) {
                if ( !block.match( /^>/m ) )
                    return undefined;

                var jsonml = [];

                // separate out the leading abutting block, if any
                if ( block[ 0 ] != ">" ) {
                    var lines = block.split( /\n/ ),
                        prev = [];

                    // keep shifting lines until you find a crotchet
                    while ( lines.length && lines[ 0 ][ 0 ] != ">" ) {
                        prev.push( lines.shift() );
                    }

                    // reassemble!
                    block = lines.join( "\n" );
                    jsonml.push.apply( jsonml, this.processBlock( prev.join( "\n" ), [] ) );
                }

                // if the next block is also a blockquote merge it in
                while ( next.length && next[ 0 ][ 0 ] == ">" ) {
                    var b = next.shift();
                    block = new String(block + block.trailing + b);
                    block.trailing = b.trailing;
                }

                // Strip off the leading "> " and re-process as a block.
                var input = block.replace( /^> ?/gm, '' ),
                    old_tree = this.tree;
                jsonml.push( this.toTree( input, [ "blockquote" ] ) );

                return jsonml;
            },

            referenceDefn: function referenceDefn( block, next) {
                var re = /^\s*\[(.*?)\]:\s*(\S+)(?:\s+(?:(['"])(.*?)\3|\((.*?)\)))?\n?/;
                // interesting matches are [ , ref_id, url, , title, title ]

                if ( !block.match(re) )
                    return undefined;

                // make an attribute node if it doesn't exist
                if ( !extract_attr( this.tree ) ) {
                    this.tree.splice( 1, 0, {} );
                }

                var attrs = extract_attr( this.tree );

                // make a references hash if it doesn't exist
                if ( attrs.references === undefined ) {
                    attrs.references = {};
                }

                var b = this.loop_re_over_block(re, block, function( m ) {

                    if ( m[2] && m[2][0] == '<' && m[2][m[2].length-1] == '>' )
                        m[2] = m[2].substring( 1, m[2].length - 1 );

                    var ref = attrs.references[ m[1].toLowerCase() ] = {
                        href: m[2]
                    };

                    if (m[4] !== undefined)
                        ref.title = m[4];
                    else if (m[5] !== undefined)
                        ref.title = m[5];

                } );

                if (b.length)
                    next.unshift( mk_block( b, block.trailing ) );

                return [];
            },

            para: function para( block, next ) {
                // everything's a para!
                return [ ["para"].concat( this.processInline( block ) ) ];
            }
        }
    };

    Markdown.dialects.Gruber.inline = {

        __oneElement__: function oneElement( text, patterns_or_re, previous_nodes ) {
            var m,
                res,
                lastIndex = 0;

            patterns_or_re = patterns_or_re || this.dialect.inline.__patterns__;
            var re = new RegExp( "([\\s\\S]*?)(" + (patterns_or_re.source || patterns_or_re) + ")" );

            m = re.exec( text );
            if (!m) {
                // Just boring text
                return [ text.length, text ];
            }
            else if ( m[1] ) {
                // Some un-interesting text matched. Return that first
                return [ m[1].length, m[1] ];
            }

            var res;
            if ( m[2] in this.dialect.inline ) {
                res = this.dialect.inline[ m[2] ].call(
                    this,
                    text.substr( m.index ), m, previous_nodes || [] );
            }
            // Default for now to make dev easier. just slurp special and output it.
            res = res || [ m[2].length, m[2] ];
            return res;
        },

        __call__: function inline( text, patterns ) {

            var out = [],
                res;

            function add(x) {
                //D:self.debug("  adding output", uneval(x));
                if (typeof x == "string" && typeof out[out.length-1] == "string")
                    out[ out.length-1 ] += x;
                else
                    out.push(x);
            }

            while ( text.length > 0 ) {
                res = this.dialect.inline.__oneElement__.call(this, text, patterns, out );
                text = text.substr( res.shift() );
                forEach(res, add )
            }

            return out;
        },

        // These characters are intersting elsewhere, so have rules for them so that
        // chunks of plain text blocks don't include them
        "]": function () {},
        "}": function () {},

        "\\": function escaped( text ) {
            // [ length of input processed, node/children to add... ]
            // Only esacape: \ ` * _ { } [ ] ( ) # * + - . !
            if ( text.match( /^\\[\\`\*_{}\[\]()#\+.!\-]/ ) )
                return [ 2, text[1] ];
            else
            // Not an esacpe
                return [ 1, "\\" ];
        },

        "![": function image( text ) {

            // Unlike images, alt text is plain text only. no other elements are
            // allowed in there

            // ![Alt text](/path/to/img.jpg "Optional title")
            //      1          2            3       4         <--- captures
            var m = text.match( /^!\[(.*?)\][ \t]*\([ \t]*(\S*)(?:[ \t]+(["'])(.*?)\3)?[ \t]*\)/ );

            if ( m ) {
                if ( m[2] && m[2][0] == '<' && m[2][m[2].length-1] == '>' )
                    m[2] = m[2].substring( 1, m[2].length - 1 );

                m[2] = this.dialect.inline.__call__.call( this, m[2], /\\/ )[0];

                var attrs = { alt: m[1], href: m[2] || "" };
                if ( m[4] !== undefined)
                    attrs.title = m[4];

                return [ m[0].length, [ "img", attrs ] ];
            }

            // ![Alt text][id]
            m = text.match( /^!\[(.*?)\][ \t]*\[(.*?)\]/ );

            if ( m ) {
                // We can't check if the reference is known here as it likely wont be
                // found till after. Check it in md tree->hmtl tree conversion
                return [ m[0].length, [ "img_ref", { alt: m[1], ref: m[2].toLowerCase(), original: m[0] } ] ];
            }

            // Just consume the '!['
            return [ 2, "![" ];
        },

        "[": function link( text ) {

            var orig = String(text);
            // Inline content is possible inside `link text`
            var res = Markdown.DialectHelpers.inline_until_char.call( this, text.substr(1), ']' );

            // No closing ']' found. Just consume the [
            if ( !res ) return [ 1, '[' ];

            var consumed = 1 + res[ 0 ],
                children = res[ 1 ],
                link,
                attrs;

            // At this point the first [...] has been parsed. See what follows to find
            // out which kind of link we are (reference or direct url)
            text = text.substr( consumed );

            // [link text](/path/to/img.jpg "Optional title")
            //                 1            2       3         <--- captures
            // This will capture up to the last paren in the block. We then pull
            // back based on if there a matching ones in the url
            //    ([here](/url/(test))
            // The parens have to be balanced
            var m = text.match( /^\s*\([ \t]*(\S+)(?:[ \t]+(["'])(.*?)\2)?[ \t]*\)/ );
            if ( m ) {
                var url = m[1];
                consumed += m[0].length;

                if ( url && url[0] == '<' && url[url.length-1] == '>' )
                    url = url.substring( 1, url.length - 1 );

                // If there is a title we don't have to worry about parens in the url
                if ( !m[3] ) {
                    var open_parens = 1; // One open that isn't in the capture
                    for (var len = 0; len < url.length; len++) {
                        switch ( url[len] ) {
                            case '(':
                                open_parens++;
                                break;
                            case ')':
                                if ( --open_parens == 0) {
                                    consumed -= url.length - len;
                                    url = url.substring(0, len);
                                }
                                break;
                        }
                    }
                }

                // Process escapes only
                url = this.dialect.inline.__call__.call( this, url, /\\/ )[0];

                attrs = { href: url || "" };
                if ( m[3] !== undefined)
                    attrs.title = m[3];

                link = [ "link", attrs ].concat( children );
                return [ consumed, link ];
            }

            // [Alt text][id]
            // [Alt text] [id]
            m = text.match( /^\s*\[(.*?)\]/ );

            if ( m ) {

                consumed += m[ 0 ].length;

                // [links][] uses links as its reference
                attrs = { ref: ( m[ 1 ] || String(children) ).toLowerCase(),  original: orig.substr( 0, consumed ) };

                link = [ "link_ref", attrs ].concat( children );

                // We can't check if the reference is known here as it likely wont be
                // found till after. Check it in md tree->hmtl tree conversion.
                // Store the original so that conversion can revert if the ref isn't found.
                return [ consumed, link ];
            }

            // [id]
            // Only if id is plain (no formatting.)
            if ( children.length == 1 && typeof children[0] == "string" ) {

                attrs = { ref: children[0].toLowerCase(),  original: orig.substr( 0, consumed ) };
                link = [ "link_ref", attrs, children[0] ];
                return [ consumed, link ];
            }

            // Just consume the '['
            return [ 1, "[" ];
        },


        "<": function autoLink( text ) {
            var m;

            if ( ( m = text.match( /^<(?:((https?|ftp|mailto):[^>]+)|(.*?@.*?\.[a-zA-Z]+))>/ ) ) != null ) {
                if ( m[3] ) {
                    return [ m[0].length, [ "link", { href: "mailto:" + m[3] }, m[3] ] ];

                }
                else if ( m[2] == "mailto" ) {
                    return [ m[0].length, [ "link", { href: m[1] }, m[1].substr("mailto:".length ) ] ];
                }
                else
                    return [ m[0].length, [ "link", { href: m[1] }, m[1] ] ];
            }

            return [ 1, "<" ];
        },

        "`": function inlineCode( text ) {
            // Inline code block. as many backticks as you like to start it
            // Always skip over the opening ticks.
            var m = text.match( /(`+)(([\s\S]*?)\1)/ );

            if ( m && m[2] )
                return [ m[1].length + m[2].length, [ "inlinecode", m[3] ] ];
            else {
                // TODO: No matching end code found - warn!
                return [ 1, "`" ];
            }
        },

        "  \n": function lineBreak( text ) {
            return [ 3, [ "linebreak" ] ];
        }

    };

// Meta Helper/generator method for em and strong handling
    function strong_em( tag, md ) {

        var state_slot = tag + "_state",
            other_slot = tag == "strong" ? "em_state" : "strong_state";

        function CloseTag(len) {
            this.len_after = len;
            this.name = "close_" + md;
        }

        return function ( text, orig_match ) {

            if (this[state_slot][0] == md) {
                // Most recent em is of this type
                //D:this.debug("closing", md);
                this[state_slot].shift();

                // "Consume" everything to go back to the recrusion in the else-block below
                return[ text.length, new CloseTag(text.length-md.length) ];
            }
            else {
                // Store a clone of the em/strong states
                var other = this[other_slot].slice(),
                    state = this[state_slot].slice();

                this[state_slot].unshift(md);

                //D:this.debug_indent += "  ";

                // Recurse
                var res = this.processInline( text.substr( md.length ) );
                //D:this.debug_indent = this.debug_indent.substr(2);

                var last = res[res.length - 1];

                //D:this.debug("processInline from", tag + ": ", uneval( res ) );

                var check = this[state_slot].shift();
                if (last instanceof CloseTag) {
                    res.pop();
                    // We matched! Huzzah.
                    var consumed = text.length - last.len_after;
                    return [ consumed, [ tag ].concat(res) ];
                }
                else {
                    // Restore the state of the other kind. We might have mistakenly closed it.
                    this[other_slot] = other;
                    this[state_slot] = state;

                    // We can't reuse the processed result as it could have wrong parsing contexts in it.
                    return [ md.length, md ];
                }
            }
        }; // End returned function
    }

    Markdown.dialects.Gruber.inline["**"] = strong_em("strong", "**");
    Markdown.dialects.Gruber.inline["__"] = strong_em("strong", "__");
    Markdown.dialects.Gruber.inline["*"]  = strong_em("em", "*");
    Markdown.dialects.Gruber.inline["_"]  = strong_em("em", "_");


// Build default order from insertion order.
    Markdown.buildBlockOrder = function(d) {
        var ord = [];
        for ( var i in d ) {
            if ( i == "__order__" || i == "__call__" ) continue;
            ord.push( i );
        }
        d.__order__ = ord;
    };

// Build patterns for inline matcher
    Markdown.buildInlinePatterns = function(d) {
        var patterns = [];

        for ( var i in d ) {
            // __foo__ is reserved and not a pattern
            if ( i.match( /^__.*__$/) ) continue;
            var l = i.replace( /([\\.*+?|()\[\]{}])/g, "\\$1" )
                .replace( /\n/, "\\n" );
            patterns.push( i.length == 1 ? l : "(?:" + l + ")" );
        }

        patterns = patterns.join("|");
        d.__patterns__ = patterns;
        //print("patterns:", uneval( patterns ) );

        var fn = d.__call__;
        d.__call__ = function(text, pattern) {
            if (pattern != undefined) {
                return fn.call(this, text, pattern);
            }
            else
            {
                return fn.call(this, text, patterns);
            }
        };
    };

    Markdown.DialectHelpers = {};
    Markdown.DialectHelpers.inline_until_char = function( text, want ) {
        var consumed = 0,
            nodes = [];

        while ( true ) {
            if ( text[ consumed ] == want ) {
                // Found the character we were looking for
                consumed++;
                return [ consumed, nodes ];
            }

            if ( consumed >= text.length ) {
                // No closing char found. Abort.
                return null;
            }

            var res = this.dialect.inline.__oneElement__.call(this, text.substr( consumed ) );
            consumed += res[ 0 ];
            // Add any returned nodes.
            nodes.push.apply( nodes, res.slice( 1 ) );
        }
    }

// Helper function to make sub-classing a dialect easier
    Markdown.subclassDialect = function( d ) {
        function Block() {}
        Block.prototype = d.block;
        function Inline() {}
        Inline.prototype = d.inline;

        return { block: new Block(), inline: new Inline() };
    };

    Markdown.buildBlockOrder ( Markdown.dialects.Gruber.block );
    Markdown.buildInlinePatterns( Markdown.dialects.Gruber.inline );

    Markdown.dialects.Maruku = Markdown.subclassDialect( Markdown.dialects.Gruber );

    Markdown.dialects.Maruku.processMetaHash = function processMetaHash( meta_string ) {
        var meta = split_meta_hash( meta_string ),
            attr = {};

        for ( var i = 0; i < meta.length; ++i ) {
            // id: #foo
            if ( /^#/.test( meta[ i ] ) ) {
                attr.id = meta[ i ].substring( 1 );
            }
            // class: .foo
            else if ( /^\./.test( meta[ i ] ) ) {
                // if class already exists, append the new one
                if ( attr['class'] ) {
                    attr['class'] = attr['class'] + meta[ i ].replace( /./, " " );
                }
                else {
                    attr['class'] = meta[ i ].substring( 1 );
                }
            }
            // attribute: foo=bar
            else if ( /\=/.test( meta[ i ] ) ) {
                var s = meta[ i ].split( /\=/ );
                attr[ s[ 0 ] ] = s[ 1 ];
            }
        }

        return attr;
    }

    function split_meta_hash( meta_string ) {
        var meta = meta_string.split( "" ),
            parts = [ "" ],
            in_quotes = false;

        while ( meta.length ) {
            var letter = meta.shift();
            switch ( letter ) {
                case " " :
                    // if we're in a quoted section, keep it
                    if ( in_quotes ) {
                        parts[ parts.length - 1 ] += letter;
                    }
                    // otherwise make a new part
                    else {
                        parts.push( "" );
                    }
                    break;
                case "'" :
                case '"' :
                    // reverse the quotes and move straight on
                    in_quotes = !in_quotes;
                    break;
                case "\\" :
                    // shift off the next letter to be used straight away.
                    // it was escaped so we'll keep it whatever it is
                    letter = meta.shift();
                default :
                    parts[ parts.length - 1 ] += letter;
                    break;
            }
        }

        return parts;
    }

    Markdown.dialects.Maruku.block.document_meta = function document_meta( block, next ) {
        // we're only interested in the first block
        if ( block.lineNumber > 1 ) return undefined;

        // document_meta blocks consist of one or more lines of `Key: Value\n`
        if ( ! block.match( /^(?:\w+:.*\n)*\w+:.*$/ ) ) return undefined;

        // make an attribute node if it doesn't exist
        if ( !extract_attr( this.tree ) ) {
            this.tree.splice( 1, 0, {} );
        }

        var pairs = block.split( /\n/ );
        for ( p in pairs ) {
            var m = pairs[ p ].match( /(\w+):\s*(.*)$/ ),
                key = m[ 1 ].toLowerCase(),
                value = m[ 2 ];

            this.tree[ 1 ][ key ] = value;
        }

        // document_meta produces no content!
        return [];
    };

    Markdown.dialects.Maruku.block.block_meta = function block_meta( block, next ) {
        // check if the last line of the block is an meta hash
        var m = block.match( /(^|\n) {0,3}\{:\s*((?:\\\}|[^\}])*)\s*\}$/ );
        if ( !m ) return undefined;

        // process the meta hash
        var attr = this.dialect.processMetaHash( m[ 2 ] );

        var hash;

        // if we matched ^ then we need to apply meta to the previous block
        if ( m[ 1 ] === "" ) {
            var node = this.tree[ this.tree.length - 1 ];
            hash = extract_attr( node );

            // if the node is a string (rather than JsonML), bail
            if ( typeof node === "string" ) return undefined;

            // create the attribute hash if it doesn't exist
            if ( !hash ) {
                hash = {};
                node.splice( 1, 0, hash );
            }

            // add the attributes in
            for ( a in attr ) {
                hash[ a ] = attr[ a ];
            }

            // return nothing so the meta hash is removed
            return [];
        }

        // pull the meta hash off the block and process what's left
        var b = block.replace( /\n.*$/, "" ),
            result = this.processBlock( b, [] );

        // get or make the attributes hash
        hash = extract_attr( result[ 0 ] );
        if ( !hash ) {
            hash = {};
            result[ 0 ].splice( 1, 0, hash );
        }

        // attach the attributes to the block
        for ( a in attr ) {
            hash[ a ] = attr[ a ];
        }

        return result;
    };

    Markdown.dialects.Maruku.block.definition_list = function definition_list( block, next ) {
        // one or more terms followed by one or more definitions, in a single block
        var tight = /^((?:[^\s:].*\n)+):\s+([\s\S]+)$/,
            list = [ "dl" ],
            i;

        // see if we're dealing with a tight or loose block
        if ( ( m = block.match( tight ) ) ) {
            // pull subsequent tight DL blocks out of `next`
            var blocks = [ block ];
            while ( next.length && tight.exec( next[ 0 ] ) ) {
                blocks.push( next.shift() );
            }

            for ( var b = 0; b < blocks.length; ++b ) {
                var m = blocks[ b ].match( tight ),
                    terms = m[ 1 ].replace( /\n$/, "" ).split( /\n/ ),
                    defns = m[ 2 ].split( /\n:\s+/ );

                // print( uneval( m ) );

                for ( i = 0; i < terms.length; ++i ) {
                    list.push( [ "dt", terms[ i ] ] );
                }

                for ( i = 0; i < defns.length; ++i ) {
                    // run inline processing over the definition
                    list.push( [ "dd" ].concat( this.processInline( defns[ i ].replace( /(\n)\s+/, "$1" ) ) ) );
                }
            }
        }
        else {
            return undefined;
        }

        return [ list ];
    };

    Markdown.dialects.Maruku.inline[ "{:" ] = function inline_meta( text, matches, out ) {
        if ( !out.length ) {
            return [ 2, "{:" ];
        }

        // get the preceeding element
        var before = out[ out.length - 1 ];

        if ( typeof before === "string" ) {
            return [ 2, "{:" ];
        }

        // match a meta hash
        var m = text.match( /^\{:\s*((?:\\\}|[^\}])*)\s*\}/ );

        // no match, false alarm
        if ( !m ) {
            return [ 2, "{:" ];
        }

        // attach the attributes to the preceeding element
        var meta = this.dialect.processMetaHash( m[ 1 ] ),
            attr = extract_attr( before );

        if ( !attr ) {
            attr = {};
            before.splice( 1, 0, attr );
        }

        for ( var k in meta ) {
            attr[ k ] = meta[ k ];
        }

        // cut out the string and replace it with nothing
        return [ m[ 0 ].length, "" ];
    };

    Markdown.buildBlockOrder ( Markdown.dialects.Maruku.block );
    Markdown.buildInlinePatterns( Markdown.dialects.Maruku.inline );

    var isArray = Array.isArray || function(obj) {
        return Object.prototype.toString.call(obj) == '[object Array]';
    };

    var forEach;
// Don't mess with Array.prototype. Its not friendly
    if ( Array.prototype.forEach ) {
        forEach = function( arr, cb, thisp ) {
            return arr.forEach( cb, thisp );
        };
    }
    else {
        forEach = function(arr, cb, thisp) {
            for (var i = 0; i < arr.length; i++) {
                cb.call(thisp || arr, arr[i], i, arr);
            }
        }
    }

    function extract_attr( jsonml ) {
        return isArray(jsonml)
            && jsonml.length > 1
            && typeof jsonml[ 1 ] === "object"
            && !( isArray(jsonml[ 1 ]) )
            ? jsonml[ 1 ]
            : undefined;
    }



    /**
     *  renderJsonML( jsonml[, options] ) -> String
     *  - jsonml (Array): JsonML array to render to XML
     *  - options (Object): options
     *
     *  Converts the given JsonML into well-formed XML.
     *
     *  The options currently understood are:
     *
     *  - root (Boolean): wether or not the root node should be included in the
     *    output, or just its children. The default `false` is to not include the
     *    root itself.
     */
    expose.renderJsonML = function( jsonml, options ) {
        options = options || {};
        // include the root element in the rendered output?
        options.root = options.root || false;

        var content = [];

        if ( options.root ) {
            content.push( render_tree( jsonml ) );
        }
        else {
            jsonml.shift(); // get rid of the tag
            if ( jsonml.length && typeof jsonml[ 0 ] === "object" && !( jsonml[ 0 ] instanceof Array ) ) {
                jsonml.shift(); // get rid of the attributes
            }

            while ( jsonml.length ) {
                content.push( render_tree( jsonml.shift() ) );
            }
        }

        return content.join( "\n\n" );
    };

    function escapeHTML( text ) {
        return text.replace( /&/g, "&amp;" )
            .replace( /</g, "&lt;" )
            .replace( />/g, "&gt;" )
            .replace( /"/g, "&quot;" )
            .replace( /'/g, "&#39;" );
    }

    function render_tree( jsonml ) {
        // basic case
        if ( typeof jsonml === "string" ) {
            return escapeHTML( jsonml );
        }

        var tag = jsonml.shift(),
            attributes = {},
            content = [];

        if ( jsonml.length && typeof jsonml[ 0 ] === "object" && !( jsonml[ 0 ] instanceof Array ) ) {
            attributes = jsonml.shift();
        }

        while ( jsonml.length ) {
            content.push( arguments.callee( jsonml.shift() ) );
        }

        var tag_attrs = "";
        for ( var a in attributes ) {
            tag_attrs += " " + a + '="' + escapeHTML( attributes[ a ] ) + '"';
        }

        // be careful about adding whitespace here for inline elements
        if ( tag == "img" || tag == "br" || tag == "hr" ) {
            return "<"+ tag + tag_attrs + "/>";
        }
        else {
            return "<"+ tag + tag_attrs + ">" + content.join( "" ) + "</" + tag + ">";
        }
    }

    function convert_tree_to_html( tree, references, options ) {
        var i;
        options = options || {};

        // shallow clone
        var jsonml = tree.slice( 0 );

        if (typeof options.preprocessTreeNode === "function") {
            jsonml = options.preprocessTreeNode(jsonml, references);
        }

        // Clone attributes if they exist
        var attrs = extract_attr( jsonml );
        if ( attrs ) {
            jsonml[ 1 ] = {};
            for ( i in attrs ) {
                jsonml[ 1 ][ i ] = attrs[ i ];
            }
            attrs = jsonml[ 1 ];
        }

        // basic case
        if ( typeof jsonml === "string" ) {
            return jsonml;
        }

        // convert this node
        switch ( jsonml[ 0 ] ) {
            case "header":
                jsonml[ 0 ] = "h" + jsonml[ 1 ].level;
                delete jsonml[ 1 ].level;
                break;
            case "bulletlist":
                jsonml[ 0 ] = "ul";
                break;
            case "numberlist":
                jsonml[ 0 ] = "ol";
                break;
            case "listitem":
                jsonml[ 0 ] = "li";
                break;
            case "para":
                jsonml[ 0 ] = "p";
                break;
            case "markdown":
                jsonml[ 0 ] = "html";
                if ( attrs ) delete attrs.references;
                break;
            case "code_block":
                jsonml[ 0 ] = "pre";
                i = attrs ? 2 : 1;
                var code = [ "code" ];
                code.push.apply( code, jsonml.splice( i ) );
                jsonml[ i ] = code;
                break;
            case "inlinecode":
                jsonml[ 0 ] = "code";
                break;
            case "img":
                jsonml[ 1 ].src = jsonml[ 1 ].href;
                delete jsonml[ 1 ].href;
                break;
            case "linebreak":
                jsonml[ 0 ] = "br";
                break;
            case "link":
                jsonml[ 0 ] = "a";
                break;
            case "link_ref":
                jsonml[ 0 ] = "a";

                // grab this ref and clean up the attribute node
                var ref = references[ attrs.ref ];

                // if the reference exists, make the link
                if ( ref ) {
                    delete attrs.ref;

                    // add in the href and title, if present
                    attrs.href = ref.href;
                    if ( ref.title ) {
                        attrs.title = ref.title;
                    }

                    // get rid of the unneeded original text
                    delete attrs.original;
                }
                // the reference doesn't exist, so revert to plain text
                else {
                    return attrs.original;
                }
                break;
            case "img_ref":
                jsonml[ 0 ] = "img";

                // grab this ref and clean up the attribute node
                var ref = references[ attrs.ref ];

                // if the reference exists, make the link
                if ( ref ) {
                    delete attrs.ref;

                    // add in the href and title, if present
                    attrs.src = ref.href;
                    if ( ref.title ) {
                        attrs.title = ref.title;
                    }

                    // get rid of the unneeded original text
                    delete attrs.original;
                }
                // the reference doesn't exist, so revert to plain text
                else {
                    return attrs.original;
                }
                break;
        }

        // convert all the children
        i = 1;

        // deal with the attribute node, if it exists
        if ( attrs ) {
            // if there are keys, skip over it
            for ( var key in jsonml[ 1 ] ) {
                i = 2;
            }
            // if there aren't, remove it
            if ( i === 1 ) {
                jsonml.splice( i, 1 );
            }
        }

        for ( ; i < jsonml.length; ++i ) {
            jsonml[ i ] = arguments.callee( jsonml[ i ], references, options );
        }

        return jsonml;
    }


// merges adjacent text nodes into a single node
    function merge_text_nodes( jsonml ) {
        // skip the tag name and attribute hash
        var i = extract_attr( jsonml ) ? 2 : 1;

        while ( i < jsonml.length ) {
            // if it's a string check the next item too
            if ( typeof jsonml[ i ] === "string" ) {
                if ( i + 1 < jsonml.length && typeof jsonml[ i + 1 ] === "string" ) {
                    // merge the second string into the first and remove it
                    jsonml[ i ] += jsonml.splice( i + 1, 1 )[ 0 ];
                }
                else {
                    ++i;
                }
            }
            // if it's not a string recurse
            else {
                arguments.callee( jsonml[ i ] );
                ++i;
            }
        }
    }

} )( (function() {
        if ( typeof exports === "undefined" ) {
            window.markdown = {};
            return window.markdown;
        }
        else {
            return exports;
        }
    } )() );
/**
 * marked - a markdown parser
 * Copyright (c) 2011-2014, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/chjj/marked
 */

;(function() {

/**
 * Block-Level Grammar
 */

var block = {
  newline: /^\n+/,
  code: /^( {4}[^\n]+\n*)+/,
  fences: noop,
  hr: /^( *[-*_]){3,} *(?:\n+|$)/,
  heading: /^ *(#{1,6}) *([^\n]+?) *#* *(?:\n+|$)/,
  nptable: noop,
  lheading: /^([^\n]+)\n *(=|-){2,} *(?:\n+|$)/,
  blockquote: /^( *>[^\n]+(\n(?!def)[^\n]+)*\n*)+/,
  list: /^( *)(bull) [\s\S]+?(?:hr|def|\n{2,}(?! )(?!\1bull )\n*|\s*$)/,
  html: /^ *(?:comment *(?:\n|\s*$)|closed *(?:\n{2,}|\s*$)|closing *(?:\n{2,}|\s*$))/,
  def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$)/,
  table: noop,
  paragraph: /^((?:[^\n]+\n?(?!hr|heading|lheading|blockquote|tag|def))+)\n*/,
  text: /^[^\n]+/
};

block.bullet = /(?:[*+-]|\d+\.)/;
block.item = /^( *)(bull) [^\n]*(?:\n(?!\1bull )[^\n]*)*/;
block.item = replace(block.item, 'gm')
  (/bull/g, block.bullet)
  ();

block.list = replace(block.list)
  (/bull/g, block.bullet)
  ('hr', '\\n+(?=\\1?(?:[-*_] *){3,}(?:\\n+|$))')
  ('def', '\\n+(?=' + block.def.source + ')')
  ();

block.blockquote = replace(block.blockquote)
  ('def', block.def)
  ();

block._tag = '(?!(?:'
  + 'a|em|strong|small|s|cite|q|dfn|abbr|data|time|code'
  + '|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo'
  + '|span|br|wbr|ins|del|img)\\b)\\w+(?!:/|[^\\w\\s@]*@)\\b';

block.html = replace(block.html)
  ('comment', /<!--[\s\S]*?-->/)
  ('closed', /<(tag)[\s\S]+?<\/\1>/)
  ('closing', /<tag(?:"[^"]*"|'[^']*'|[^'">])*?>/)
  (/tag/g, block._tag)
  ();

block.paragraph = replace(block.paragraph)
  ('hr', block.hr)
  ('heading', block.heading)
  ('lheading', block.lheading)
  ('blockquote', block.blockquote)
  ('tag', '<' + block._tag)
  ('def', block.def)
  ();

/**
 * Normal Block Grammar
 */

block.normal = merge({}, block);

/**
 * GFM Block Grammar
 */

block.gfm = merge({}, block.normal, {
  fences: /^ *(`{3,}|~{3,}) *(\S+)? *\n([\s\S]+?)\s*\1 *(?:\n+|$)/,
  paragraph: /^/
});

block.gfm.paragraph = replace(block.paragraph)
  ('(?!', '(?!'
    + block.gfm.fences.source.replace('\\1', '\\2') + '|'
    + block.list.source.replace('\\1', '\\3') + '|')
  ();

/**
 * GFM + Tables Block Grammar
 */

block.tables = merge({}, block.gfm, {
  nptable: /^ *(\S.*\|.*)\n *([-:]+ *\|[-| :]*)\n((?:.*\|.*(?:\n|$))*)\n*/,
  table: /^ *\|(.+)\n *\|( *[-:]+[-| :]*)\n((?: *\|.*(?:\n|$))*)\n*/
});

/**
 * Block Lexer
 */

function Lexer(options) {
  this.tokens = [];
  this.tokens.links = {};
  this.options = options || marked.defaults;
  this.rules = block.normal;

  if (this.options.gfm) {
    if (this.options.tables) {
      this.rules = block.tables;
    } else {
      this.rules = block.gfm;
    }
  }
}

/**
 * Expose Block Rules
 */

Lexer.rules = block;

/**
 * Static Lex Method
 */

Lexer.lex = function(src, options) {
  var lexer = new Lexer(options);
  return lexer.lex(src);
};

/**
 * Preprocessing
 */

Lexer.prototype.lex = function(src) {
  src = src
    .replace(/\r\n|\r/g, '\n')
    .replace(/\t/g, '    ')
    .replace(/\u00a0/g, ' ')
    .replace(/\u2424/g, '\n');

  return this.token(src, true);
};

/**
 * Lexing
 */

Lexer.prototype.token = function(src, top, bq) {
  var src = src.replace(/^ +$/gm, '')
    , next
    , loose
    , cap
    , bull
    , b
    , item
    , space
    , i
    , l;

  while (src) {
    // newline
    if (cap = this.rules.newline.exec(src)) {
      src = src.substring(cap[0].length);
      if (cap[0].length > 1) {
        this.tokens.push({
          type: 'space'
        });
      }
    }

    // code
    if (cap = this.rules.code.exec(src)) {
      src = src.substring(cap[0].length);
      cap = cap[0].replace(/^ {4}/gm, '');
      this.tokens.push({
        type: 'code',
        text: !this.options.pedantic
          ? cap.replace(/\n+$/, '')
          : cap
      });
      continue;
    }

    // fences (gfm)
    if (cap = this.rules.fences.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'code',
        lang: cap[2],
        text: cap[3]
      });
      continue;
    }

    // heading
    if (cap = this.rules.heading.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'heading',
        depth: cap[1].length,
        text: cap[2]
      });
      continue;
    }

    // table no leading pipe (gfm)
    if (top && (cap = this.rules.nptable.exec(src))) {
      src = src.substring(cap[0].length);

      item = {
        type: 'table',
        header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
        align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
        cells: cap[3].replace(/\n$/, '').split('\n')
      };

      for (i = 0; i < item.align.length; i++) {
        if (/^ *-+: *$/.test(item.align[i])) {
          item.align[i] = 'right';
        } else if (/^ *:-+: *$/.test(item.align[i])) {
          item.align[i] = 'center';
        } else if (/^ *:-+ *$/.test(item.align[i])) {
          item.align[i] = 'left';
        } else {
          item.align[i] = null;
        }
      }

      for (i = 0; i < item.cells.length; i++) {
        item.cells[i] = item.cells[i].split(/ *\| */);
      }

      this.tokens.push(item);

      continue;
    }

    // lheading
    if (cap = this.rules.lheading.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'heading',
        depth: cap[2] === '=' ? 1 : 2,
        text: cap[1]
      });
      continue;
    }

    // hr
    if (cap = this.rules.hr.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'hr'
      });
      continue;
    }

    // blockquote
    if (cap = this.rules.blockquote.exec(src)) {
      src = src.substring(cap[0].length);

      this.tokens.push({
        type: 'blockquote_start'
      });

      cap = cap[0].replace(/^ *> ?/gm, '');

      // Pass `top` to keep the current
      // "toplevel" state. This is exactly
      // how markdown.pl works.
      this.token(cap, top, true);

      this.tokens.push({
        type: 'blockquote_end'
      });

      continue;
    }

    // list
    if (cap = this.rules.list.exec(src)) {
      src = src.substring(cap[0].length);
      bull = cap[2];

      this.tokens.push({
        type: 'list_start',
        ordered: bull.length > 1
      });

      // Get each top-level item.
      cap = cap[0].match(this.rules.item);

      next = false;
      l = cap.length;
      i = 0;

      for (; i < l; i++) {
        item = cap[i];

        // Remove the list item's bullet
        // so it is seen as the next token.
        space = item.length;
        item = item.replace(/^ *([*+-]|\d+\.) +/, '');

        // Outdent whatever the
        // list item contains. Hacky.
        if (~item.indexOf('\n ')) {
          space -= item.length;
          item = !this.options.pedantic
            ? item.replace(new RegExp('^ {1,' + space + '}', 'gm'), '')
            : item.replace(/^ {1,4}/gm, '');
        }

        // Determine whether the next list item belongs here.
        // Backpedal if it does not belong in this list.
        if (this.options.smartLists && i !== l - 1) {
          b = block.bullet.exec(cap[i + 1])[0];
          if (bull !== b && !(bull.length > 1 && b.length > 1)) {
            src = cap.slice(i + 1).join('\n') + src;
            i = l - 1;
          }
        }

        // Determine whether item is loose or not.
        // Use: /(^|\n)(?! )[^\n]+\n\n(?!\s*$)/
        // for discount behavior.
        loose = next || /\n\n(?!\s*$)/.test(item);
        if (i !== l - 1) {
          next = item.charAt(item.length - 1) === '\n';
          if (!loose) loose = next;
        }

        this.tokens.push({
          type: loose
            ? 'loose_item_start'
            : 'list_item_start'
        });

        // Recurse.
        this.token(item, false, bq);

        this.tokens.push({
          type: 'list_item_end'
        });
      }

      this.tokens.push({
        type: 'list_end'
      });

      continue;
    }

    // html
    if (cap = this.rules.html.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: this.options.sanitize
          ? 'paragraph'
          : 'html',
        pre: cap[1] === 'pre' || cap[1] === 'script' || cap[1] === 'style',
        text: cap[0]
      });
      continue;
    }

    // def
    if ((!bq && top) && (cap = this.rules.def.exec(src))) {
      src = src.substring(cap[0].length);
      this.tokens.links[cap[1].toLowerCase()] = {
        href: cap[2],
        title: cap[3]
      };
      continue;
    }

    // table (gfm)
    if (top && (cap = this.rules.table.exec(src))) {
      src = src.substring(cap[0].length);

      item = {
        type: 'table',
        header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
        align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
        cells: cap[3].replace(/(?: *\| *)?\n$/, '').split('\n')
      };

      for (i = 0; i < item.align.length; i++) {
        if (/^ *-+: *$/.test(item.align[i])) {
          item.align[i] = 'right';
        } else if (/^ *:-+: *$/.test(item.align[i])) {
          item.align[i] = 'center';
        } else if (/^ *:-+ *$/.test(item.align[i])) {
          item.align[i] = 'left';
        } else {
          item.align[i] = null;
        }
      }

      for (i = 0; i < item.cells.length; i++) {
        item.cells[i] = item.cells[i]
          .replace(/^ *\| *| *\| *$/g, '')
          .split(/ *\| */);
      }

      this.tokens.push(item);

      continue;
    }

    // top-level paragraph
    if (top && (cap = this.rules.paragraph.exec(src))) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'paragraph',
        text: cap[1].charAt(cap[1].length - 1) === '\n'
          ? cap[1].slice(0, -1)
          : cap[1]
      });
      continue;
    }

    // text
    if (cap = this.rules.text.exec(src)) {
      // Top-level should never reach here.
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'text',
        text: cap[0]
      });
      continue;
    }

    if (src) {
      throw new
        Error('Infinite loop on byte: ' + src.charCodeAt(0));
    }
  }

  return this.tokens;
};

/**
 * Inline-Level Grammar
 */

var inline = {
  escape: /^\\([\\`*{}\[\]()#+\-.!_>])/,
  autolink: /^<([^ >]+(@|:\/)[^ >]+)>/,
  url: noop,
  tag: /^<!--[\s\S]*?-->|^<\/?\w+(?:"[^"]*"|'[^']*'|[^'">])*?>/,
  link: /^!?\[(inside)\]\(href\)/,
  reflink: /^!?\[(inside)\]\s*\[([^\]]*)\]/,
  nolink: /^!?\[((?:\[[^\]]*\]|[^\[\]])*)\]/,
  strong: /^__([\s\S]+?)__(?!_)|^\*\*([\s\S]+?)\*\*(?!\*)/,
  em: /^\b_((?:__|[\s\S])+?)_\b|^\*((?:\*\*|[\s\S])+?)\*(?!\*)/,
  code: /^(`+)\s*([\s\S]*?[^`])\s*\1(?!`)/,
  br: /^ {2,}\n(?!\s*$)/,
  del: noop,
  text: /^[\s\S]+?(?=[\\<!\[_*`]| {2,}\n|$)/
};

inline._inside = /(?:\[[^\]]*\]|[^\[\]]|\](?=[^\[]*\]))*/;
inline._href = /\s*<?([\s\S]*?)>?(?:\s+['"]([\s\S]*?)['"])?\s*/;

inline.link = replace(inline.link)
  ('inside', inline._inside)
  ('href', inline._href)
  ();

inline.reflink = replace(inline.reflink)
  ('inside', inline._inside)
  ();

/**
 * Normal Inline Grammar
 */

inline.normal = merge({}, inline);

/**
 * Pedantic Inline Grammar
 */

inline.pedantic = merge({}, inline.normal, {
  strong: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
  em: /^_(?=\S)([\s\S]*?\S)_(?!_)|^\*(?=\S)([\s\S]*?\S)\*(?!\*)/
});

/**
 * GFM Inline Grammar
 */

inline.gfm = merge({}, inline.normal, {
  escape: replace(inline.escape)('])', '~|])')(),
  url: /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/,
  del: /^~~(?=\S)([\s\S]*?\S)~~/,
  text: replace(inline.text)
    (']|', '~]|')
    ('|', '|https?://|')
    ()
});

/**
 * GFM + Line Breaks Inline Grammar
 */

inline.breaks = merge({}, inline.gfm, {
  br: replace(inline.br)('{2,}', '*')(),
  text: replace(inline.gfm.text)('{2,}', '*')()
});

/**
 * Inline Lexer & Compiler
 */

function InlineLexer(links, options) {
  this.options = options || marked.defaults;
  this.links = links;
  this.rules = inline.normal;
  this.renderer = this.options.renderer || new Renderer;
  this.renderer.options = this.options;

  if (!this.links) {
    throw new
      Error('Tokens array requires a `links` property.');
  }

  if (this.options.gfm) {
    if (this.options.breaks) {
      this.rules = inline.breaks;
    } else {
      this.rules = inline.gfm;
    }
  } else if (this.options.pedantic) {
    this.rules = inline.pedantic;
  }
}

/**
 * Expose Inline Rules
 */

InlineLexer.rules = inline;

/**
 * Static Lexing/Compiling Method
 */

InlineLexer.output = function(src, links, options) {
  var inline = new InlineLexer(links, options);
  return inline.output(src);
};

/**
 * Lexing/Compiling
 */

InlineLexer.prototype.output = function(src) {
  var out = ''
    , link
    , text
    , href
    , cap;

  while (src) {
    // escape
    if (cap = this.rules.escape.exec(src)) {
      src = src.substring(cap[0].length);
      out += cap[1];
      continue;
    }

    // autolink
    if (cap = this.rules.autolink.exec(src)) {
      src = src.substring(cap[0].length);
      if (cap[2] === '@') {
        text = cap[1].charAt(6) === ':'
          ? this.mangle(cap[1].substring(7))
          : this.mangle(cap[1]);
        href = this.mangle('mailto:') + text;
      } else {
        text = escape(cap[1]);
        href = text;
      }
      out += this.renderer.link(href, null, text);
      continue;
    }

    // url (gfm)
    if (!this.inLink && (cap = this.rules.url.exec(src))) {
      src = src.substring(cap[0].length);
      text = escape(cap[1]);
      href = text;
      out += this.renderer.link(href, null, text);
      continue;
    }

    // tag
    if (cap = this.rules.tag.exec(src)) {
      if (!this.inLink && /^<a /i.test(cap[0])) {
        this.inLink = true;
      } else if (this.inLink && /^<\/a>/i.test(cap[0])) {
        this.inLink = false;
      }
      src = src.substring(cap[0].length);
      out += this.options.sanitize
        ? escape(cap[0])
        : cap[0];
      continue;
    }

    // link
    if (cap = this.rules.link.exec(src)) {
      src = src.substring(cap[0].length);
      this.inLink = true;
      out += this.outputLink(cap, {
        href: cap[2],
        title: cap[3]
      });
      this.inLink = false;
      continue;
    }

    // reflink, nolink
    if ((cap = this.rules.reflink.exec(src))
        || (cap = this.rules.nolink.exec(src))) {
      src = src.substring(cap[0].length);
      link = (cap[2] || cap[1]).replace(/\s+/g, ' ');
      link = this.links[link.toLowerCase()];
      if (!link || !link.href) {
        out += cap[0].charAt(0);
        src = cap[0].substring(1) + src;
        continue;
      }
      this.inLink = true;
      out += this.outputLink(cap, link);
      this.inLink = false;
      continue;
    }

    // strong
    if (cap = this.rules.strong.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.strong(this.output(cap[2] || cap[1]));
      continue;
    }

    // em
    if (cap = this.rules.em.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.em(this.output(cap[2] || cap[1]));
      continue;
    }

    // code
    if (cap = this.rules.code.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.codespan(escape(cap[2], true));
      continue;
    }

    // br
    if (cap = this.rules.br.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.br();
      continue;
    }

    // del (gfm)
    if (cap = this.rules.del.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.del(this.output(cap[1]));
      continue;
    }

    // text
    if (cap = this.rules.text.exec(src)) {
      src = src.substring(cap[0].length);
      out += escape(this.smartypants(cap[0]));
      continue;
    }

    if (src) {
      throw new
        Error('Infinite loop on byte: ' + src.charCodeAt(0));
    }
  }

  return out;
};

/**
 * Compile Link
 */

InlineLexer.prototype.outputLink = function(cap, link) {
  var href = escape(link.href)
    , title = link.title ? escape(link.title) : null;

  return cap[0].charAt(0) !== '!'
    ? this.renderer.link(href, title, this.output(cap[1]))
    : this.renderer.image(href, title, escape(cap[1]));
};

/**
 * Smartypants Transformations
 */

InlineLexer.prototype.smartypants = function(text) {
  if (!this.options.smartypants) return text;
  return text
    // em-dashes
    .replace(/--/g, '\u2014')
    // opening singles
    .replace(/(^|[-\u2014/(\[{"\s])'/g, '$1\u2018')
    // closing singles & apostrophes
    .replace(/'/g, '\u2019')
    // opening doubles
    .replace(/(^|[-\u2014/(\[{\u2018\s])"/g, '$1\u201c')
    // closing doubles
    .replace(/"/g, '\u201d')
    // ellipses
    .replace(/\.{3}/g, '\u2026');
};

/**
 * Mangle Links
 */

InlineLexer.prototype.mangle = function(text) {
  var out = ''
    , l = text.length
    , i = 0
    , ch;

  for (; i < l; i++) {
    ch = text.charCodeAt(i);
    if (Math.random() > 0.5) {
      ch = 'x' + ch.toString(16);
    }
    out += '&#' + ch + ';';
  }

  return out;
};

/**
 * Renderer
 */

function Renderer(options) {
  this.options = options || {};
}

Renderer.prototype.code = function(code, lang, escaped) {
  if (this.options.highlight) {
    var out = this.options.highlight(code, lang);
    if (out != null && out !== code) {
      escaped = true;
      code = out;
    }
  }

  if (!lang) {
    return '<pre><code>'
      + (escaped ? code : escape(code, true))
      + '\n</code></pre>';
  }

  return '<pre><code class="'
    + this.options.langPrefix
    + escape(lang, true)
    + '">'
    + (escaped ? code : escape(code, true))
    + '\n</code></pre>\n';
};

Renderer.prototype.blockquote = function(quote) {
  return '<blockquote>\n' + quote + '</blockquote>\n';
};

Renderer.prototype.html = function(html) {
  return html;
};

Renderer.prototype.heading = function(text, level, raw) {
  return '<h'
    + level
    + ' id="'
    + this.options.headerPrefix
    + raw.toLowerCase().replace(/[^\w]+/g, '-')
    + '">'
    + text
    + '</h'
    + level
    + '>\n';
};

Renderer.prototype.hr = function() {
  return this.options.xhtml ? '<hr/>\n' : '<hr>\n';
};

Renderer.prototype.list = function(body, ordered) {
  var type = ordered ? 'ol' : 'ul';
  return '<' + type + '>\n' + body + '</' + type + '>\n';
};

Renderer.prototype.listitem = function(text) {
  return '<li>' + text + '</li>\n';
};

Renderer.prototype.paragraph = function(text) {
  return '<p>' + text + '</p>\n';
};

Renderer.prototype.table = function(header, body) {
  return '<table>\n'
    + '<thead>\n'
    + header
    + '</thead>\n'
    + '<tbody>\n'
    + body
    + '</tbody>\n'
    + '</table>\n';
};

Renderer.prototype.tablerow = function(content) {
  return '<tr>\n' + content + '</tr>\n';
};

Renderer.prototype.tablecell = function(content, flags) {
  var type = flags.header ? 'th' : 'td';
  var tag = flags.align
    ? '<' + type + ' style="text-align:' + flags.align + '">'
    : '<' + type + '>';
  return tag + content + '</' + type + '>\n';
};

// span level renderer
Renderer.prototype.strong = function(text) {
  return '<strong>' + text + '</strong>';
};

Renderer.prototype.em = function(text) {
  return '<em>' + text + '</em>';
};

Renderer.prototype.codespan = function(text) {
  return '<code>' + text + '</code>';
};

Renderer.prototype.br = function() {
  return this.options.xhtml ? '<br/>' : '<br>';
};

Renderer.prototype.del = function(text) {
  return '<del>' + text + '</del>';
};

Renderer.prototype.link = function(href, title, text) {
  if (this.options.sanitize) {
    try {
      var prot = decodeURIComponent(unescape(href))
        .replace(/[^\w:]/g, '')
        .toLowerCase();
    } catch (e) {
      return '';
    }
    if (prot.indexOf('javascript:') === 0) {
      return '';
    }
  }
  var out = '<a href="' + href + '"';
  if (title) {
    out += ' title="' + title + '"';
  }
  out += '>' + text + '</a>';
  return out;
};

Renderer.prototype.image = function(href, title, text) {
  var out = '<img src="' + href + '" alt="' + text + '"';
  if (title) {
    out += ' title="' + title + '"';
  }
  out += this.options.xhtml ? '/>' : '>';
  return out;
};

/**
 * Parsing & Compiling
 */

function Parser(options) {
  this.tokens = [];
  this.token = null;
  this.options = options || marked.defaults;
  this.options.renderer = this.options.renderer || new Renderer;
  this.renderer = this.options.renderer;
  this.renderer.options = this.options;
}

/**
 * Static Parse Method
 */

Parser.parse = function(src, options, renderer) {
  var parser = new Parser(options, renderer);
  return parser.parse(src);
};

/**
 * Parse Loop
 */

Parser.prototype.parse = function(src) {
  this.inline = new InlineLexer(src.links, this.options, this.renderer);
  this.tokens = src.reverse();

  var out = '';
  while (this.next()) {
    out += this.tok();
  }

  return out;
};

/**
 * Next Token
 */

Parser.prototype.next = function() {
  return this.token = this.tokens.pop();
};

/**
 * Preview Next Token
 */

Parser.prototype.peek = function() {
  return this.tokens[this.tokens.length - 1] || 0;
};

/**
 * Parse Text Tokens
 */

Parser.prototype.parseText = function() {
  var body = this.token.text;

  while (this.peek().type === 'text') {
    body += '\n' + this.next().text;
  }

  return this.inline.output(body);
};

/**
 * Parse Current Token
 */

Parser.prototype.tok = function() {
  switch (this.token.type) {
    case 'space': {
      return '';
    }
    case 'hr': {
      return this.renderer.hr();
    }
    case 'heading': {
      return this.renderer.heading(
        this.inline.output(this.token.text),
        this.token.depth,
        this.token.text);
    }
    case 'code': {
      return this.renderer.code(this.token.text,
        this.token.lang,
        this.token.escaped);
    }
    case 'table': {
      var header = ''
        , body = ''
        , i
        , row
        , cell
        , flags
        , j;

      // header
      cell = '';
      for (i = 0; i < this.token.header.length; i++) {
        flags = { header: true, align: this.token.align[i] };
        cell += this.renderer.tablecell(
          this.inline.output(this.token.header[i]),
          { header: true, align: this.token.align[i] }
        );
      }
      header += this.renderer.tablerow(cell);

      for (i = 0; i < this.token.cells.length; i++) {
        row = this.token.cells[i];

        cell = '';
        for (j = 0; j < row.length; j++) {
          cell += this.renderer.tablecell(
            this.inline.output(row[j]),
            { header: false, align: this.token.align[j] }
          );
        }

        body += this.renderer.tablerow(cell);
      }
      return this.renderer.table(header, body);
    }
    case 'blockquote_start': {
      var body = '';

      while (this.next().type !== 'blockquote_end') {
        body += this.tok();
      }

      return this.renderer.blockquote(body);
    }
    case 'list_start': {
      var body = ''
        , ordered = this.token.ordered;

      while (this.next().type !== 'list_end') {
        body += this.tok();
      }

      return this.renderer.list(body, ordered);
    }
    case 'list_item_start': {
      var body = '';

      while (this.next().type !== 'list_item_end') {
        body += this.token.type === 'text'
          ? this.parseText()
          : this.tok();
      }

      return this.renderer.listitem(body);
    }
    case 'loose_item_start': {
      var body = '';

      while (this.next().type !== 'list_item_end') {
        body += this.tok();
      }

      return this.renderer.listitem(body);
    }
    case 'html': {
      var html = !this.token.pre && !this.options.pedantic
        ? this.inline.output(this.token.text)
        : this.token.text;
      return this.renderer.html(html);
    }
    case 'paragraph': {
      return this.renderer.paragraph(this.inline.output(this.token.text));
    }
    case 'text': {
      return this.renderer.paragraph(this.parseText());
    }
  }
};

/**
 * Helpers
 */

function escape(html, encode) {
  return html
    .replace(!encode ? /&(?!#?\w+;)/g : /&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function unescape(html) {
  return html.replace(/&([#\w]+);/g, function(_, n) {
    n = n.toLowerCase();
    if (n === 'colon') return ':';
    if (n.charAt(0) === '#') {
      return n.charAt(1) === 'x'
        ? String.fromCharCode(parseInt(n.substring(2), 16))
        : String.fromCharCode(+n.substring(1));
    }
    return '';
  });
}

function replace(regex, opt) {
  regex = regex.source;
  opt = opt || '';
  return function self(name, val) {
    if (!name) return new RegExp(regex, opt);
    val = val.source || val;
    val = val.replace(/(^|[^\[])\^/g, '$1');
    regex = regex.replace(name, val);
    return self;
  };
}

function noop() {}
noop.exec = noop;

function merge(obj) {
  var i = 1
    , target
    , key;

  for (; i < arguments.length; i++) {
    target = arguments[i];
    for (key in target) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        obj[key] = target[key];
      }
    }
  }

  return obj;
}


/**
 * Marked
 */

function marked(src, opt, callback) {
  if (callback || typeof opt === 'function') {
    if (!callback) {
      callback = opt;
      opt = null;
    }

    opt = merge({}, marked.defaults, opt || {});

    var highlight = opt.highlight
      , tokens
      , pending
      , i = 0;

    try {
      tokens = Lexer.lex(src, opt)
    } catch (e) {
      return callback(e);
    }

    pending = tokens.length;

    var done = function(err) {
      if (err) {
        opt.highlight = highlight;
        return callback(err);
      }

      var out;

      try {
        out = Parser.parse(tokens, opt);
      } catch (e) {
        err = e;
      }

      opt.highlight = highlight;

      return err
        ? callback(err)
        : callback(null, out);
    };

    if (!highlight || highlight.length < 3) {
      return done();
    }

    delete opt.highlight;

    if (!pending) return done();

    for (; i < tokens.length; i++) {
      (function(token) {
        if (token.type !== 'code') {
          return --pending || done();
        }
        return highlight(token.text, token.lang, function(err, code) {
          if (err) return done(err);
          if (code == null || code === token.text) {
            return --pending || done();
          }
          token.text = code;
          token.escaped = true;
          --pending || done();
        });
      })(tokens[i]);
    }

    return;
  }
  try {
    if (opt) opt = merge({}, marked.defaults, opt);
    return Parser.parse(Lexer.lex(src, opt), opt);
  } catch (e) {
    e.message += '\nPlease report this to https://github.com/chjj/marked.';
    if ((opt || marked.defaults).silent) {
      return '<p>An error occured:</p><pre>'
        + escape(e.message + '', true)
        + '</pre>';
    }
    throw e;
  }
}

/**
 * Options
 */

marked.options =
marked.setOptions = function(opt) {
  merge(marked.defaults, opt);
  return marked;
};

marked.defaults = {
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  smartLists: false,
  silent: false,
  highlight: null,
  langPrefix: 'lang-',
  smartypants: false,
  headerPrefix: '',
  renderer: new Renderer,
  xhtml: false
};

/**
 * Expose
 */

marked.Parser = Parser;
marked.parser = Parser.parse;

marked.Renderer = Renderer;

marked.Lexer = Lexer;
marked.lexer = Lexer.lex;

marked.InlineLexer = InlineLexer;
marked.inlineLexer = InlineLexer.output;

marked.parse = marked;

if (typeof module !== 'undefined' && typeof exports === 'object') {
  module.exports = marked;
} else if (typeof define === 'function' && define.amd) {
  define(function() { return marked; });
} else {
  this.marked = marked;
}

}).call(function() {
  return this || (typeof window !== 'undefined' ? window : global);
}());
/*
 * to-markdown - an HTML to Markdown converter
 *
 * Copyright 2011, Dom Christie
 * Licenced under the MIT licence
 *
 */

if (typeof he !== 'object' && typeof require === 'function') {
  var he = require('he');
}

var toMarkdown = function(string) {

  var ELEMENTS = [
    {
      patterns: 'p',
      replacement: function(str, attrs, innerHTML) {
        return innerHTML ? '\n\n' + innerHTML + '\n' : '';
      }
    },
    {
      patterns: 'br',
      type: 'void',
      replacement: '  \n'
    },
    {
      patterns: 'h([1-6])',
      replacement: function(str, hLevel, attrs, innerHTML) {
        var hPrefix = '';
        for(var i = 0; i < hLevel; i++) {
          hPrefix += '#';
        }
        return '\n\n' + hPrefix + ' ' + innerHTML + '\n';
      }
    },
    {
      patterns: 'hr',
      type: 'void',
      replacement: '\n\n* * *\n'
    },
    {
      patterns: 'a',
      replacement: function(str, attrs, innerHTML) {
        var href = attrs.match(attrRegExp('href')),
            title = attrs.match(attrRegExp('title'));
        return href ? '[' + innerHTML + ']' + '(' + href[1] + (title && title[1] ? ' "' + title[1] + '"' : '') + ')' : str;
      }
    },
    {
      patterns: ['b', 'strong'],
      replacement: function(str, attrs, innerHTML) {
        return innerHTML ? '**' + innerHTML + '**' : '';
      }
    },
    {
      patterns: ['i', 'em'],
      replacement: function(str, attrs, innerHTML) {
        return innerHTML ? '_' + innerHTML + '_' : '';
      }
    },
    {
      patterns: 'code',
      replacement: function(str, attrs, innerHTML) {
        return innerHTML ? '`' + he.decode(innerHTML) + '`' : '';
      }
    },
    {
      patterns: 'img',
      type: 'void',
      replacement: function(str, attrs, innerHTML) {
        var src = attrs.match(attrRegExp('src')),
            alt = attrs.match(attrRegExp('alt')),
            title = attrs.match(attrRegExp('title'));
        return '![' + (alt && alt[1] ? alt[1] : '') + ']' + '(' + src[1] + (title && title[1] ? ' "' + title[1] + '"' : '') + ')';
      }
    }
  ];

  for(var i = 0, len = ELEMENTS.length; i < len; i++) {
    if(typeof ELEMENTS[i].patterns === 'string') {
      string = replaceEls(string, { tag: ELEMENTS[i].patterns, replacement: ELEMENTS[i].replacement, type:  ELEMENTS[i].type });
    }
    else {
      for(var j = 0, pLen = ELEMENTS[i].patterns.length; j < pLen; j++) {
        string = replaceEls(string, { tag: ELEMENTS[i].patterns[j], replacement: ELEMENTS[i].replacement, type:  ELEMENTS[i].type });
      }
    }
  }

  function replaceEls(html, elProperties) {
    var pattern = elProperties.type === 'void' ? '<' + elProperties.tag + '\\b([^>]*)\\/?>' : '<' + elProperties.tag + '\\b([^>]*)>([\\s\\S]*?)<\\/' + elProperties.tag + '>',
        regex = new RegExp(pattern, 'gi'),
        markdown = '';
    if(typeof elProperties.replacement === 'string') {
      markdown = html.replace(regex, elProperties.replacement);
    }
    else {
      markdown = html.replace(regex, function(str, p1, p2, p3) {
        return elProperties.replacement.call(this, str, p1, p2, p3);
      });
    }
    return markdown;
  }

  function attrRegExp(attr) {
    return new RegExp(attr + '\\s*=\\s*["\']?([^"\']*)["\']?', 'i');
  }

  // Pre code blocks

  string = string.replace(/<pre\b[^>]*>`([\s\S]*?)`<\/pre>/gi, function(str, innerHTML) {
    var text = he.decode(innerHTML);
    text = text.replace(/^\t+/g, '  '); // convert tabs to spaces (you know it makes sense)
    text = text.replace(/\n/g, '\n    ');
    return '\n\n    ' + text + '\n';
  });

  // Lists

  // Escape numbers that could trigger an ol
  // If there are more than three spaces before the code, it would be in a pre tag
  // Make sure we are escaping the period not matching any character
  string = string.replace(/^(\s{0,3}\d+)\. /g, '$1\\. ');

  // Converts lists that have no child lists (of same type) first, then works its way up
  var noChildrenRegex = /<(ul|ol)\b[^>]*>(?:(?!<ul|<ol)[\s\S])*?<\/\1>/gi;
  while(string.match(noChildrenRegex)) {
    string = string.replace(noChildrenRegex, function(str) {
      return replaceLists(str);
    });
  }

  function replaceLists(html) {

    html = html.replace(/<(ul|ol)\b[^>]*>([\s\S]*?)<\/\1>/gi, function(str, listType, innerHTML) {
      var lis = innerHTML.split('</li>');
      lis.splice(lis.length - 1, 1);

      for(i = 0, len = lis.length; i < len; i++) {
        if(lis[i]) {
          var prefix = (listType === 'ol') ? (i + 1) + ".  " : "*   ";
          lis[i] = lis[i].replace(/\s*<li[^>]*>([\s\S]*)/i, function(str, innerHTML) {

            innerHTML = innerHTML.replace(/^\s+/, '');
            innerHTML = innerHTML.replace(/\n\n/g, '\n\n    ');
            // indent nested lists
            innerHTML = innerHTML.replace(/\n([ ]*)+(\*|\d+\.) /g, '\n$1    $2 ');
            return prefix + innerHTML;
          });
        }
        lis[i] = lis[i].replace(/(.) +$/m, '$1');
      }
      return lis.join('\n');
    });

    return '\n\n' + html.replace(/[ \t]+\n|\s+$/g, '');
  }

  // Blockquotes
  var deepest = /<blockquote\b[^>]*>((?:(?!<blockquote)[\s\S])*?)<\/blockquote>/gi;
  while(string.match(deepest)) {
    string = string.replace(deepest, function(str) {
      return replaceBlockquotes(str);
    });
  }

  function replaceBlockquotes(html) {
    html = html.replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, function(str, inner) {
      inner = inner.replace(/^\s+|\s+$/g, '');
      inner = cleanUp(inner);
      inner = inner.replace(/^/gm, '> ');
      inner = inner.replace(/^(>([ \t]{2,}>)+)/gm, '> >');
      return inner;
    });
    return html;
  }

  function cleanUp(string) {
    string = string.replace(/^[\t\r\n]+|[\t\r\n]+$/g, ''); // trim leading/trailing whitespace
    string = string.replace(/\n\s+\n/g, '\n\n');
    string = string.replace(/\n{3,}/g, '\n\n'); // limit consecutive linebreaks to 2
    return string;
  }

  return cleanUp(string);
};

if (typeof exports === 'object') {
  exports.toMarkdown = toMarkdown;
}
/* ===================================================
 * bootstrap-markdown.js v2.7.0
 * http://github.com/toopay/bootstrap-markdown
 * ===================================================
 * Copyright 2013-2014 Taufan Aditya
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */

!function ($) {

  "use strict"; // jshint ;_;


  /* MARKDOWN CLASS DEFINITION
   * ========================== */

  var Markdown = function (element, options) {
    // Class Properties
    this.$ns           = 'bootstrap-markdown'
    this.$element      = $(element)
    this.$editable     = {el:null, type:null,attrKeys:[], attrValues:[], content:null}
    this.$options      = $.extend(true, {}, $.fn.markdown.defaults, options, this.$element.data(), this.$element.data('options'))
    this.$oldContent   = null
    this.$isPreview    = false
    this.$isFullscreen = false
    this.$editor       = null
    this.$textarea     = null
    this.$handler      = []
    this.$callback     = []
    this.$nextTab      = []

    this.showEditor()
  }

  Markdown.prototype = {

    constructor: Markdown

  , __alterButtons: function(name,alter) {
      var handler = this.$handler, isAll = (name == 'all'),that = this

      $.each(handler,function(k,v) {
        var halt = true
        if (isAll) {
          halt = false
        } else {
          halt = v.indexOf(name) < 0
        }

        if (halt == false) {
          alter(that.$editor.find('button[data-handler="'+v+'"]'))
        }
      })
    }

  , __buildButtons: function(buttonsArray, container) {
      var i,
          ns = this.$ns,
          handler = this.$handler,
          callback = this.$callback

      for (i=0;i<buttonsArray.length;i++) {
        // Build each group container
        var y, btnGroups = buttonsArray[i]
        for (y=0;y<btnGroups.length;y++) {
          // Build each button group
          var z,
              buttons = btnGroups[y].data,
              btnGroupContainer = $('<div/>', {
                                    'class': 'btn-group'
                                  })

          for (z=0;z<buttons.length;z++) {
            var button = buttons[z],
                buttonContainer, buttonIconContainer,
                buttonHandler = ns+'-'+button.name,
                buttonIcon = this.__getIcon(button.icon),
                btnText = button.btnText ? button.btnText : '',
                btnClass = button.btnClass ? button.btnClass : 'btn',
                tabIndex = button.tabIndex ? button.tabIndex : '-1',
                hotkey = typeof button.hotkey !== 'undefined' ? button.hotkey : '',
                hotkeyCaption = typeof jQuery.hotkeys !== 'undefined' && hotkey !== '' ? ' ('+hotkey+')' : ''

            // Construct the button object
            buttonContainer = $('<button></button>');
            buttonContainer.text(' ' + this.__localize(btnText)).addClass('btn-default btn-sm').addClass(btnClass);
            if(btnClass.match(/btn\-(primary|success|info|warning|danger|link)/)){
                buttonContainer.removeClass('btn-default');
            }
            buttonContainer.attr({
                'type': 'button',
                'title': this.__localize(button.title) + hotkeyCaption,
                'tabindex': tabIndex,
                'data-provider': ns,
                'data-handler': buttonHandler,
                'data-hotkey': hotkey
            });
            if (button.toggle == true){
              buttonContainer.attr('data-toggle', 'button');
            }
            buttonIconContainer = $('<span/>');
            buttonIconContainer.addClass(buttonIcon);
            buttonIconContainer.prependTo(buttonContainer);

            // Attach the button object
            btnGroupContainer.append(buttonContainer);

            // Register handler and callback
            handler.push(buttonHandler);
            callback.push(button.callback);
          }

          // Attach the button group into container dom
          container.append(btnGroupContainer);
        }
      }

      return container;
    }
  , __setListener: function() {
      // Set size and resizable Properties
      var hasRows = typeof this.$textarea.attr('rows') != 'undefined',
          maxRows = this.$textarea.val().split("\n").length > 5 ? this.$textarea.val().split("\n").length : '5',
          rowsVal = hasRows ? this.$textarea.attr('rows') : maxRows

      this.$textarea.attr('rows',rowsVal)
      if (this.$options.resize) {
        this.$textarea.css('resize',this.$options.resize)
      }

      this.$textarea
        .on('focus',    $.proxy(this.focus, this))
        .on('keypress', $.proxy(this.keypress, this))
        .on('keyup',    $.proxy(this.keyup, this))
        .on('change',   $.proxy(this.change, this))

      if (this.eventSupported('keydown')) {
        this.$textarea.on('keydown', $.proxy(this.keydown, this))
      }

      // Re-attach markdown data
      this.$textarea.data('markdown',this)
    }

  , __handle: function(e) {
      var target = $(e.currentTarget),
          handler = this.$handler,
          callback = this.$callback,
          handlerName = target.attr('data-handler'),
          callbackIndex = handler.indexOf(handlerName),
          callbackHandler = callback[callbackIndex]

      // Trigger the focusin
      $(e.currentTarget).focus()

      callbackHandler(this)

      // Trigger onChange for each button handle
      this.change(this);

      // Unless it was the save handler,
      // focusin the textarea
      if (handlerName.indexOf('cmdSave') < 0) {
        this.$textarea.focus()
      }

      e.preventDefault()
    }

  , __localize: function(string) {
      var messages = $.fn.markdown.messages,
          language = this.$options.language
      if (
        typeof messages !== 'undefined' &&
        typeof messages[language] !== 'undefined' &&
        typeof messages[language][string] !== 'undefined'
      ) {
        return messages[language][string];
      }
      return string;
    }

  , __getIcon: function(src) {
    return typeof src == 'object' ? src[this.$options.iconlibrary] : src;
  }

  , setFullscreen: function(mode) {
    var $editor = this.$editor,
        $textarea = this.$textarea

    if (mode === true) {
      $editor.addClass('md-fullscreen-mode')
      $('body').addClass('md-nooverflow')
      this.$options.onFullscreen(this)
    } else {
      $editor.removeClass('md-fullscreen-mode')
      $('body').removeClass('md-nooverflow')
    }

    this.$isFullscreen = mode;
    $textarea.focus()
  }

  , showEditor: function() {
      var instance = this,
          textarea,
          ns = this.$ns,
          container = this.$element,
          originalHeigth = container.css('height'),
          originalWidth = container.css('width'),
          editable = this.$editable,
          handler = this.$handler,
          callback = this.$callback,
          options = this.$options,
          editor = $( '<div/>', {
                      'class': 'md-editor',
                      click: function() {
                        instance.focus()
                      }
                    })

      // Prepare the editor
      if (this.$editor == null) {
        // Create the panel
        var editorHeader = $('<div/>', {
                            'class': 'md-header btn-toolbar'
                            })

        // Merge the main & additional button groups together
        var allBtnGroups = []
        if (options.buttons.length > 0) allBtnGroups = allBtnGroups.concat(options.buttons[0])
        if (options.additionalButtons.length > 0) allBtnGroups = allBtnGroups.concat(options.additionalButtons[0])

        // Reduce and/or reorder the button groups
        if (options.reorderButtonGroups.length > 0) {
          allBtnGroups = allBtnGroups
              .filter(function(btnGroup) {
                return options.reorderButtonGroups.indexOf(btnGroup.name) > -1
              })
              .sort(function(a, b) {
                if (options.reorderButtonGroups.indexOf(a.name) < options.reorderButtonGroups.indexOf(b.name)) return -1
                if (options.reorderButtonGroups.indexOf(a.name) > options.reorderButtonGroups.indexOf(b.name)) return 1
                return 0
              })
        }

        // Build the buttons
        if (allBtnGroups.length > 0) {
          editorHeader = this.__buildButtons([allBtnGroups], editorHeader)
        }

        if (options.fullscreen.enable) {
          editorHeader.append('<div class="md-controls"><a class="md-control md-control-fullscreen" href="#"><span class="'+this.__getIcon(options.fullscreen.icons.fullscreenOn)+'"></span></a></div>').on('click', '.md-control-fullscreen', function(e) {
              e.preventDefault();
              instance.setFullscreen(true)
          })
        }

        editor.append(editorHeader)

        // Wrap the textarea
        if (container.is('textarea')) {
          container.before(editor)
          textarea = container
          textarea.addClass('md-input')
          editor.append(textarea)
        } else {
          var rawContent = (typeof toMarkdown == 'function') ? toMarkdown(container.html()) : container.html(),
              currentContent = $.trim(rawContent)

          // This is some arbitrary content that could be edited
          textarea = $('<textarea/>', {
                       'class': 'md-input',
                       'val' : currentContent
                      })

          editor.append(textarea)

          // Save the editable
          editable.el = container
          editable.type = container.prop('tagName').toLowerCase()
          editable.content = container.html()

          $(container[0].attributes).each(function(){
            editable.attrKeys.push(this.nodeName)
            editable.attrValues.push(this.nodeValue)
          })

          // Set editor to blocked the original container
          container.replaceWith(editor)
        }

        var editorFooter = $('<div/>', {
                           'class': 'md-footer'
                         }),
            createFooter = false,
            footer = ''
        // Create the footer if savable
        if (options.savable) {
          createFooter = true;
          var saveHandler = 'cmdSave'

          // Register handler and callback
          handler.push(saveHandler)
          callback.push(options.onSave)

          editorFooter.append('<button class="btn btn-success" data-provider="'
                              +ns
                              +'" data-handler="'
                              +saveHandler
                              +'"><i class="icon icon-white icon-ok"></i> '
                              +this.__localize('Save')
                              +'</button>')


        }

        footer = typeof options.footer === 'function' ? options.footer(this) : options.footer

        if ($.trim(footer) !== '') {
          createFooter = true;
          editorFooter.append(footer);
        }

        if (createFooter) editor.append(editorFooter)

        // Set width
        if (options.width && options.width !== 'inherit') {
          if (jQuery.isNumeric(options.width)) {
            editor.css('display', 'table')
            textarea.css('width', options.width + 'px')
          } else {
            editor.addClass(options.width)
          }
        }

        // Set height
        if (options.height && options.height !== 'inherit') {
          if (jQuery.isNumeric(options.height)) {
            var height = options.height
            if (editorHeader) height = Math.max(0, height - editorHeader.outerHeight())
            if (editorFooter) height = Math.max(0, height - editorFooter.outerHeight())
            textarea.css('height', height + 'px')
          } else {
            editor.addClass(options.height)
          }
        }

        // Reference
        this.$editor     = editor
        this.$textarea   = textarea
        this.$editable   = editable
        this.$oldContent = this.getContent()

        this.__setListener()

        // Set editor attributes, data short-hand API and listener
        this.$editor.attr('id',(new Date).getTime())
        this.$editor.on('click', '[data-provider="bootstrap-markdown"]', $.proxy(this.__handle, this))

        if (this.$element.is(':disabled') || this.$element.is('[readonly]')) {
          this.$editor.addClass('md-editor-disabled');
          this.disableButtons('all');
        }

        if (this.eventSupported('keydown') && typeof jQuery.hotkeys === 'object') {
          editorHeader.find('[data-provider="bootstrap-markdown"]').each(function() {
            var $button = $(this),
              hotkey = $button.attr('data-hotkey')
            if (hotkey.toLowerCase() !== '') {
              textarea.bind('keydown', hotkey, function() {
                $button.trigger('click')
                return false;
              })
            }
          })
        }

        if (options.initialstate === 'preview') {
          this.showPreview();
        } else if (options.initialstate === 'fullscreen' && options.fullscreen.enable) {
          this.setFullscreen(true)
        }

      } else {
        this.$editor.show()
      }

      if (options.autofocus) {
        this.$textarea.focus()
        this.$editor.addClass('active')
      }

      if (options.fullscreen.enable && options.fullscreen !== false) {
        this.$editor.append('\
          <div class="md-fullscreen-controls">\
            <a href="#" class="exit-fullscreen" title="Exit fullscreen"><span class="'+this.__getIcon(options.fullscreen.icons.fullscreenOff)+'"></span></a>\
          </div>')

        this.$editor.on('click', '.exit-fullscreen', function(e) {
          e.preventDefault()
          instance.setFullscreen(false)
        })
      }

      // hide hidden buttons from options
      this.hideButtons(options.hiddenButtons)

      // disable disabled buttons from options
      this.disableButtons(options.disabledButtons)

      // Trigger the onShow hook
      options.onShow(this)

      return this
    }

  , parseContent: function() {
      var content,
        callbackContent = this.$options.onPreview(this) // Try to get the content from callback

      if (typeof callbackContent == 'string') {
        // Set the content based by callback content
        content = callbackContent
      } else {
        // Set the content
        var val = this.$textarea.val();
        if(typeof markdown == 'object') {
          content = markdown.toHTML(val);
        }else if(typeof marked == 'function') {
          content = marked(val);
        } else {
          content = val;
        }
      }

      return content;
    }

  , showPreview: function() {
      var options = this.$options,
          container = this.$textarea,
          afterContainer = container.next(),
          replacementContainer = $('<div/>',{'class':'md-preview','data-provider':'markdown-preview'}),
          content

      // Give flag that tell the editor enter preview mode
      this.$isPreview = true
      // Disable all buttons
      this.disableButtons('all').enableButtons('cmdPreview')

      content = this.parseContent()

      // Build preview element
      replacementContainer.html(content)

      if (afterContainer && afterContainer.attr('class') == 'md-footer') {
        // If there is footer element, insert the preview container before it
        replacementContainer.insertBefore(afterContainer)
      } else {
        // Otherwise, just append it after textarea
        container.parent().append(replacementContainer)
      }

      // Set the preview element dimensions
      replacementContainer.css({
        width: container.outerWidth() + 'px',
        height: container.outerHeight() + 'px'
      })

      if (this.$options.resize) {
        replacementContainer.css('resize',this.$options.resize)
      }

      // Hide the last-active textarea
      container.hide()

      // Attach the editor instances
      replacementContainer.data('markdown',this)

      if (this.$element.is(':disabled') || this.$element.is('[readonly]')) {
        this.$editor.addClass('md-editor-disabled');
        this.disableButtons('all');
      }

      return this
    }

  , hidePreview: function() {
      // Give flag that tell the editor quit preview mode
      this.$isPreview = false

      // Obtain the preview container
      var container = this.$editor.find('div[data-provider="markdown-preview"]')

      // Remove the preview container
      container.remove()

      // Enable all buttons
      this.enableButtons('all')
      // Disable configured disabled buttons
      this.disableButtons(this.$options.disabledButtons)

      // Back to the editor
      this.$textarea.show()
      this.__setListener()

      return this
    }

  , isDirty: function() {
      return this.$oldContent != this.getContent()
    }

  , getContent: function() {
      return this.$textarea.val()
    }

  , setContent: function(content) {
      this.$textarea.val(content)

      return this
    }

  , findSelection: function(chunk) {
    var content = this.getContent(), startChunkPosition

    if (startChunkPosition = content.indexOf(chunk), startChunkPosition >= 0 && chunk.length > 0) {
      var oldSelection = this.getSelection(), selection

      this.setSelection(startChunkPosition,startChunkPosition+chunk.length)
      selection = this.getSelection()

      this.setSelection(oldSelection.start,oldSelection.end)

      return selection
    } else {
      return null
    }
  }

  , getSelection: function() {

      var e = this.$textarea[0]

      return (

          ('selectionStart' in e && function() {
              var l = e.selectionEnd - e.selectionStart
              return { start: e.selectionStart, end: e.selectionEnd, length: l, text: e.value.substr(e.selectionStart, l) }
          }) ||

          /* browser not supported */
          function() {
            return null
          }

      )()

    }

  , setSelection: function(start,end) {

      var e = this.$textarea[0]

      return (

          ('selectionStart' in e && function() {
              e.selectionStart = start
              e.selectionEnd = end
              return
          }) ||

          /* browser not supported */
          function() {
            return null
          }

      )()

    }

  , replaceSelection: function(text) {

      var e = this.$textarea[0]

      return (

          ('selectionStart' in e && function() {
              e.value = e.value.substr(0, e.selectionStart) + text + e.value.substr(e.selectionEnd, e.value.length)
              // Set cursor to the last replacement end
              e.selectionStart = e.value.length
              return this
          }) ||

          /* browser not supported */
          function() {
              e.value += text
              return jQuery(e)
          }

      )()

    }

  , getNextTab: function() {
      // Shift the nextTab
      if (this.$nextTab.length == 0) {
        return null
      } else {
        var nextTab, tab = this.$nextTab.shift()

        if (typeof tab == 'function') {
          nextTab = tab()
        } else if (typeof tab == 'object' && tab.length > 0) {
          nextTab = tab
        }

        return nextTab
      }
    }

  , setNextTab: function(start,end) {
      // Push new selection into nextTab collections
      if (typeof start == 'string') {
        var that = this
        this.$nextTab.push(function(){
          return that.findSelection(start)
        })
      } else if (typeof start == 'number' && typeof end == 'number') {
        var oldSelection = this.getSelection()

        this.setSelection(start,end)
        this.$nextTab.push(this.getSelection())

        this.setSelection(oldSelection.start,oldSelection.end)
      }

      return
    }

  , __parseButtonNameParam: function(nameParam) {
      var buttons = []

      if (typeof nameParam == 'string') {
        buttons = nameParam.split(',')
      } else {
        buttons = nameParam
      }

      return buttons
    }

  , enableButtons: function(name) {
      var buttons = this.__parseButtonNameParam(name),
        that = this

      $.each(buttons, function(i, v) {
        that.__alterButtons(buttons[i], function (el) {
          el.removeAttr('disabled')
        });
      })

      return this;
    }

  , disableButtons: function(name) {
      var buttons = this.__parseButtonNameParam(name),
        that = this

      $.each(buttons, function(i, v) {
        that.__alterButtons(buttons[i], function (el) {
          el.attr('disabled','disabled')
        });
      })

      return this;
    }

  , hideButtons: function(name) {
      var buttons = this.__parseButtonNameParam(name),
        that = this

      $.each(buttons, function(i, v) {
        that.__alterButtons(buttons[i], function (el) {
          el.addClass('hidden');
        });
      })

      return this;

    }

  , showButtons: function(name) {
      var buttons = this.__parseButtonNameParam(name),
        that = this

      $.each(buttons, function(i, v) {
        that.__alterButtons(buttons[i], function (el) {
          el.removeClass('hidden');
        });
      })

      return this;

    }

  , eventSupported: function(eventName) {
      var isSupported = eventName in this.$element
      if (!isSupported) {
        this.$element.setAttribute(eventName, 'return;')
        isSupported = typeof this.$element[eventName] === 'function'
      }
      return isSupported
    }

  , keyup: function (e) {
      var blocked = false
      switch(e.keyCode) {
        case 40: // down arrow
        case 38: // up arrow
        case 16: // shift
        case 17: // ctrl
        case 18: // alt
          break

        case 9: // tab
          var nextTab
          if (nextTab = this.getNextTab(),nextTab != null) {
            // Get the nextTab if exists
            var that = this
            setTimeout(function(){
              that.setSelection(nextTab.start,nextTab.end)
            },500)

            blocked = true
          } else {
            // The next tab memory contains nothing...
            // check the cursor position to determine tab action
            var cursor = this.getSelection()

            if (cursor.start == cursor.end && cursor.end == this.getContent().length) {
              // The cursor already reach the end of the content
              blocked = false

            } else {
              // Put the cursor to the end
              this.setSelection(this.getContent().length,this.getContent().length)

              blocked = true
            }
          }

          break

        case 13: // enter
          blocked = false
          break
        case 27: // escape
          if (this.$isFullscreen) this.setFullscreen(false)
          blocked = false
          break

        default:
          blocked = false
      }

      if (blocked) {
        e.stopPropagation()
        e.preventDefault()
      }

      this.$options.onChange(this)
    }

  , change: function(e) {
      this.$options.onChange(this);
      return this;
    }

  , focus: function (e) {
      var options = this.$options,
          isHideable = options.hideable,
          editor = this.$editor

      editor.addClass('active')

      // Blur other markdown(s)
      $(document).find('.md-editor').each(function(){
        if ($(this).attr('id') != editor.attr('id')) {
          var attachedMarkdown

          if (attachedMarkdown = $(this).find('textarea').data('markdown'),
              attachedMarkdown == null) {
              attachedMarkdown = $(this).find('div[data-provider="markdown-preview"]').data('markdown')
          }

          if (attachedMarkdown) {
            attachedMarkdown.blur()
          }
        }
      })

      // Trigger the onFocus hook
      options.onFocus(this);

      return this
    }

  , blur: function (e) {
      var options = this.$options,
          isHideable = options.hideable,
          editor = this.$editor,
          editable = this.$editable

      if (editor.hasClass('active') || this.$element.parent().length == 0) {
        editor.removeClass('active')

        if (isHideable) {

          // Check for editable elements
          if (editable.el != null) {
            // Build the original element
            var oldElement = $('<'+editable.type+'/>'),
                content = this.getContent(),
                currentContent = (typeof markdown == 'object') ? markdown.toHTML(content) : content

            $(editable.attrKeys).each(function(k,v) {
              oldElement.attr(editable.attrKeys[k],editable.attrValues[k])
            })

            // Get the editor content
            oldElement.html(currentContent)

            editor.replaceWith(oldElement)
          } else {
            editor.hide()

          }
        }

        // Trigger the onBlur hook
        options.onBlur(this)
      }

      return this
    }

  }

 /* MARKDOWN PLUGIN DEFINITION
  * ========================== */

  var old = $.fn.markdown

  $.fn.markdown = function (option) {
    return this.each(function () {
      var $this = $(this)
        , data = $this.data('markdown')
        , options = typeof option == 'object' && option
      if (!data) $this.data('markdown', (data = new Markdown(this, options)))
    })
  }

  $.fn.markdown.messages = {}

  $.fn.markdown.defaults = {
    /* Editor Properties */
    autofocus: false,
    hideable: false,
    savable:false,
    width: 'inherit',
    height: 'inherit',
    resize: 'none',
    iconlibrary: 'glyph',
    language: 'en',
    initialstate: 'editor',

    /* Buttons Properties */
    buttons: [
      [{
        name: 'groupFont',
        data: [{
          name: 'cmdBold',
          hotkey: 'Ctrl+B',
          title: 'Bold',
          icon: { glyph: 'glyphicon glyphicon-bold', fa: 'fa fa-bold', 'fa-3': 'icon-bold' },
          callback: function(e){
            // Give/remove ** surround the selection
            var chunk, cursor, selected = e.getSelection(), content = e.getContent()

            if (selected.length == 0) {
              // Give extra word
              chunk = e.__localize('strong text')
            } else {
              chunk = selected.text
            }

            // transform selection and set the cursor into chunked text
            if (content.substr(selected.start-2,2) == '**'
                && content.substr(selected.end,2) == '**' ) {
              e.setSelection(selected.start-2,selected.end+2)
              e.replaceSelection(chunk)
              cursor = selected.start-2
            } else {
              e.replaceSelection('**'+chunk+'**')
              cursor = selected.start+2
            }

            // Set the cursor
            e.setSelection(cursor,cursor+chunk.length)
          }
        },{
          name: 'cmdItalic',
          title: 'Italic',
          hotkey: 'Ctrl+I',
          icon: { glyph: 'glyphicon glyphicon-italic', fa: 'fa fa-italic', 'fa-3': 'icon-italic' },
          callback: function(e){
            // Give/remove * surround the selection
            var chunk, cursor, selected = e.getSelection(), content = e.getContent()

            if (selected.length == 0) {
              // Give extra word
              chunk = e.__localize('emphasized text')
            } else {
              chunk = selected.text
            }

            // transform selection and set the cursor into chunked text
            if (content.substr(selected.start-1,1) == '_'
                && content.substr(selected.end,1) == '_' ) {
              e.setSelection(selected.start-1,selected.end+1)
              e.replaceSelection(chunk)
              cursor = selected.start-1
            } else {
              e.replaceSelection('_'+chunk+'_')
              cursor = selected.start+1
            }

            // Set the cursor
            e.setSelection(cursor,cursor+chunk.length)
          }
        },{
          name: 'cmdHeading',
          title: 'Heading',
          hotkey: 'Ctrl+H',
          icon: { glyph: 'glyphicon glyphicon-header', fa: 'fa fa-header', 'fa-3': 'icon-font' },
          callback: function(e){
            // Append/remove ### surround the selection
            var chunk, cursor, selected = e.getSelection(), content = e.getContent(), pointer, prevChar

            if (selected.length == 0) {
              // Give extra word
              chunk = e.__localize('heading text')
            } else {
              chunk = selected.text + '\n';
            }

            // transform selection and set the cursor into chunked text
            if ((pointer = 4, content.substr(selected.start-pointer,pointer) == '### ')
                || (pointer = 3, content.substr(selected.start-pointer,pointer) == '###')) {
              e.setSelection(selected.start-pointer,selected.end)
              e.replaceSelection(chunk)
              cursor = selected.start-pointer
            } else if (selected.start > 0 && (prevChar = content.substr(selected.start-1,1), !!prevChar && prevChar != '\n')) {
              e.replaceSelection('\n\n### '+chunk)
              cursor = selected.start+6
            } else {
              // Empty string before element
              e.replaceSelection('### '+chunk)
              cursor = selected.start+4
            }

            // Set the cursor
            e.setSelection(cursor,cursor+chunk.length)
          }
        }]
      },{
        name: 'groupLink',
        data: [{
          name: 'cmdUrl',
          title: 'URL/Link',
          hotkey: 'Ctrl+L',
          icon: { glyph: 'glyphicon glyphicon-link', fa: 'fa fa-link', 'fa-3': 'icon-link' },
          callback: function(e){
            // Give [] surround the selection and prepend the link
            var chunk, cursor, selected = e.getSelection(), content = e.getContent(), link

            if (selected.length == 0) {
              // Give extra word
              chunk = e.__localize('enter link description here')
            } else {
              chunk = selected.text
            }

            link = prompt(e.__localize('Insert Hyperlink'),'http://')

            if (link != null && link != '' && link != 'http://' && link.substr(0,4) == 'http') {
              var sanitizedLink = $('<div>'+link+'</div>').text()

              // transform selection and set the cursor into chunked text
              e.replaceSelection('['+chunk+']('+sanitizedLink+')')
              cursor = selected.start+1

              // Set the cursor
              e.setSelection(cursor,cursor+chunk.length)
            }
          }
        },{
          name: 'cmdImage',
          title: 'Image',
          hotkey: 'Ctrl+G',
          icon: { glyph: 'glyphicon glyphicon-picture', fa: 'fa fa-picture-o', 'fa-3': 'icon-picture' },
          callback: function(e){
            // Give ![] surround the selection and prepend the image link
            var chunk, cursor, selected = e.getSelection(), content = e.getContent(), link

            if (selected.length == 0) {
              // Give extra word
              chunk = e.__localize('enter image description here')
            } else {
              chunk = selected.text
            }

            link = prompt(e.__localize('Insert Image Hyperlink'),'http://')

            if (link != null && link != '' && link != 'http://' && link.substr(0,4) == 'http') {
              var sanitizedLink = $('<div>'+link+'</div>').text()
              
              // transform selection and set the cursor into chunked text
              e.replaceSelection('!['+chunk+']('+sanitizedLink+' "'+e.__localize('enter image title here')+'")')
              cursor = selected.start+2

              // Set the next tab
              e.setNextTab(e.__localize('enter image title here'))

              // Set the cursor
              e.setSelection(cursor,cursor+chunk.length)
            }
          }
        }]
      },{
        name: 'groupMisc',
        data: [{
          name: 'cmdList',
          hotkey: 'Ctrl+U',
          title: 'Unordered List',
          icon: { glyph: 'glyphicon glyphicon-list', fa: 'fa fa-list', 'fa-3': 'icon-list-ul' },
          callback: function(e){
            // Prepend/Give - surround the selection
            var chunk, cursor, selected = e.getSelection(), content = e.getContent()

            // transform selection and set the cursor into chunked text
            if (selected.length == 0) {
              // Give extra word
              chunk = e.__localize('list text here')

              e.replaceSelection('- '+chunk)
              // Set the cursor
              cursor = selected.start+2

            } else {
              if (selected.text.indexOf('\n') < 0) {
                chunk = selected.text

                e.replaceSelection('- '+chunk)

                // Set the cursor
                cursor = selected.start+2
              } else {
                var list = []

                list = selected.text.split('\n')
                chunk = list[0]

                $.each(list,function(k,v) {
                  list[k] = '- '+v
                })

                e.replaceSelection('\n\n'+list.join('\n'))

                // Set the cursor
                cursor = selected.start+4
              }
            }

            // Set the cursor
            e.setSelection(cursor,cursor+chunk.length)
          }
        },
        {
          name: 'cmdListO',
          hotkey: 'Ctrl+O',
          title: 'Ordered List',
          icon: { glyph: 'glyphicon glyphicon-th-list', fa: 'fa fa-list-ol', 'fa-3': 'icon-list-ol' },
          callback: function(e) {

            // Prepend/Give - surround the selection
            var chunk, cursor, selected = e.getSelection(), content = e.getContent()

            // transform selection and set the cursor into chunked text
            if (selected.length == 0) {
              // Give extra word
              chunk = e.__localize('list text here')
              e.replaceSelection('1. '+chunk)
              // Set the cursor
              cursor = selected.start+3

            } else {
              if (selected.text.indexOf('\n') < 0) {
                chunk = selected.text

                e.replaceSelection('1. '+chunk)

                // Set the cursor
                cursor = selected.start+3
              } else {
                var list = []

                list = selected.text.split('\n')
                chunk = list[0]

                $.each(list,function(k,v) {
                  list[k] = '1. '+v
                })

                e.replaceSelection('\n\n'+list.join('\n'))

                // Set the cursor
                cursor = selected.start+5
              }
            }

            // Set the cursor
            e.setSelection(cursor,cursor+chunk.length)
          }
        },
        {
          name: 'cmdCode',
          hotkey: 'Ctrl+K',
          title: 'Code',
          icon: { glyph: 'glyphicon glyphicon-asterisk', fa: 'fa fa-code', 'fa-3': 'icon-code' },
          callback: function(e) {

            // Give/remove ** surround the selection
            var chunk, cursor, selected = e.getSelection(), content = e.getContent()

            if (selected.length == 0) {
              // Give extra word
              chunk = e.__localize('code text here')
            } else {
              chunk = selected.text
            }

            // transform selection and set the cursor into chunked text
            if (content.substr(selected.start-4,4) === '```\n'
                && content.substr(selected.end,4) === '\n```') {
              e.setSelection(selected.start-4, selected.end+4)
              e.replaceSelection(chunk)
              cursor = selected.start-4
            } else if (content.substr(selected.start-1,1) === '`'
                && content.substr(selected.end,1) === '`') {
              e.setSelection(selected.start-1,selected.end+1)
              e.replaceSelection(chunk)
              cursor = selected.start-1
            } else if (content.indexOf('\n') > -1) {
              e.replaceSelection('```\n'+chunk+'\n```')
              cursor = selected.start+4
            } else {
              e.replaceSelection('`'+chunk+'`')
              cursor = selected.start+1
            }

            // Set the cursor
            e.setSelection(cursor,cursor+chunk.length)
          }
        },
        {
          name: 'cmdQuote',
          hotkey: 'Ctrl+Q',
          title: 'Quote',
          icon: { glyph: 'glyphicon glyphicon-comment', fa: 'fa fa-quote-left', 'fa-3': 'icon-quote-left' },
          callback: function(e) {
            // Prepend/Give - surround the selection
            var chunk, cursor, selected = e.getSelection(), content = e.getContent()

            // transform selection and set the cursor into chunked text
            if (selected.length == 0) {
              // Give extra word
              chunk = e.__localize('quote here')
              e.replaceSelection('> '+chunk)
              // Set the cursor
              cursor = selected.start+2

            } else {
              if (selected.text.indexOf('\n') < 0) {
                chunk = selected.text

                e.replaceSelection('> '+chunk)

                // Set the cursor
                cursor = selected.start+2
              } else {
                var list = []

                list = selected.text.split('\n')
                chunk = list[0]

                $.each(list,function(k,v) {
                  list[k] = '> '+v
                })

                e.replaceSelection('\n\n'+list.join('\n'))

                // Set the cursor
                cursor = selected.start+4
              }
            }

            // Set the cursor
            e.setSelection(cursor,cursor+chunk.length)
          }
        }]
      },{
        name: 'groupUtil',
        data: [{
          name: 'cmdPreview',
          toggle: true,
          hotkey: 'Ctrl+P',
          title: 'Preview',
          btnText: 'Preview',
          btnClass: 'btn btn-primary btn-sm',
          icon: { glyph: 'glyphicon glyphicon-search', fa: 'fa fa-search', 'fa-3': 'icon-search' },
          callback: function(e){
            // Check the preview mode and toggle based on this flag
            var isPreview = e.$isPreview,content

            if (isPreview == false) {
              // Give flag that tell the editor enter preview mode
              e.showPreview()
            } else {
              e.hidePreview()
            }
          }
        }]
      }]
    ],
    additionalButtons:[], // Place to hook more buttons by code
    reorderButtonGroups:[],
    hiddenButtons:[], // Default hidden buttons
    disabledButtons:[], // Default disabled buttons
    footer: '',
    fullscreen: {
      enable: true,
      icons: {
        fullscreenOn: {
          fa: 'fa fa-expand',
          glyph: 'glyphicon glyphicon-fullscreen',
          'fa-3': 'icon-resize-full'
        },
        fullscreenOff: {
          fa: 'fa fa-compress',
          glyph: 'glyphicon glyphicon-fullscreen',
          'fa-3': 'icon-resize-small'
        }
      }
    },

    /* Events hook */
    onShow: function (e) {},
    onPreview: function (e) {},
    onSave: function (e) {},
    onBlur: function (e) {},
    onFocus: function (e) {},
    onChange: function(e) {},
    onFullscreen: function(e) {}
  }

  $.fn.markdown.Constructor = Markdown


 /* MARKDOWN NO CONFLICT
  * ==================== */

  $.fn.markdown.noConflict = function () {
    $.fn.markdown = old
    return this
  }

  /* MARKDOWN GLOBAL FUNCTION & DATA-API
  * ==================================== */
  var initMarkdown = function(el) {
    var $this = el

    if ($this.data('markdown')) {
      $this.data('markdown').showEditor()
      return
    }

    $this.markdown()
  }

  var blurNonFocused = function(e) {
    var $activeElement = $(document.activeElement)

    // Blur event
    $(document).find('.md-editor').each(function(){
      var $this            = $(this),
          focused          = $activeElement.closest('.md-editor')[0] === this,
          attachedMarkdown = $this.find('textarea').data('markdown') ||
                             $this.find('div[data-provider="markdown-preview"]').data('markdown')

      if (attachedMarkdown && !focused) {
        attachedMarkdown.blur()
      }
    })
  }

  $(document)
    .on('click.markdown.data-api', '[data-provide="markdown-editable"]', function (e) {
      initMarkdown($(this))
      e.preventDefault()
    })
    .on('click focusin', function (e) {
      blurNonFocused(e)
    })
    .ready(function(){
      $('textarea[data-provide="markdown"]').each(function(){
        initMarkdown($(this))
      })
    })

}(window.jQuery);
