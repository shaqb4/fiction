<?php

namespace Fiction\MarkdownEditorBundle\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\Controller;

class DefaultController extends Controller
{
    public function indexAction($name)
    {
        return $this->render('FictionMarkdownEditorBundle:Default:index.html.twig', array('name' => $name));
    }
}
