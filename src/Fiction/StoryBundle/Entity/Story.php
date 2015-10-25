<?php

namespace Fiction\StoryBundle\Entity;

use Doctrine\ORM\Mapping as ORM;
use Doctrine\Common\Collections\ArrayCollection;

/**
 * Story
 */
class Story
{
    /**
     * @var integer
     */
    private $id;

    /**
     * @var string
     */
    private $title;

    /**
     * @var string
     */
    private $description;
    
    /**
     * @var ArrayCollection
     */
    protected $chapters;
    
	/**
     * @var \DateTime
     */
    private $created_at;

    /**
     * @var \DateTime
     */
    private $updated_at;
    
    /**
     * 
     * @var \Fiction\UserBundle\Entity\User
     * @TODO
     */
    //protected $user;
    
    /**
     * 
     * @var \Fiction\StoryBundle\Entity\StoryCategory
     */
    protected $categories;
    
    /**
     * 
     * @var \Fiction\WorldBundle\Entity\World
     */
    protected $world;
    
    /**
     * 
     * @var ArrayCollection
     * @TODO
     */
    //protected $parents;
    
    /**
     * 
     * @var ArrayCollection
     * @TODO
     */
    //protected $children;
    
    /**
    *
    * @var integer
    */
    private $word_count;
    
    /**
     * Constructor
     */
    public function __construct()
    {
    	$this->chapters = new ArrayCollection();
    	$this->categories = new ArrayCollection();
        //@TODO
    	//$this->parents = new ArrayCollection();
    	//$this->children = new ArrayCollection();
    }

    /**
     * Get id
     *
     * @return integer 
     */
    public function getId()
    {
        return $this->id;
    }

    /**
     * Set title
     *
     * @param string $title
     * @return Story
     */
    public function setTitle($title)
    {
        $this->title = $title;

        return $this;
    }

    /**
     * Get title
     *
     * @return string 
     */
    public function getTitle()
    {
        return $this->title;
    }

    /**
     * Set description
     *
     * @param string $description
     * @return Story
     */
    public function setDescription($description)
    {
        $this->description = $description;

        return $this;
    }

    /**
     * Get description
     *
     * @return string 
     */
    public function getDescription()
    {
        return $this->description;
    }

    /**
     * Add chapters
     *
     * @param \Fiction\StoryBundle\Entity\Chapter $chapters
     * @return Story
     */
    public function addChapter(\Fiction\StoryBundle\Entity\Chapter $chapters)
    {
        $this->chapters[] = $chapters;

        return $this;
    }

    /**
     * Remove chapters
     *
     * @param \Fiction\StoryBundle\Entity\Chapter $chapters
     */
    public function removeChapter(\Fiction\StoryBundle\Entity\Chapter $chapters)
    {
        $this->chapters->removeElement($chapters);
    }

    /**
     * Get chapters
     *
     * @return \Doctrine\Common\Collections\Collection 
     */
    public function getChapters()
    {
        return $this->chapters;
    }

    /**
     * Set created_at
     *
     * @param \DateTime $createdAt
     * @return Story
     */
    public function setCreatedAt($createdAt)
    {
        $this->created_at = $createdAt;

        return $this;
    }

    /**
     * Get created_at
     *
     * @return \DateTime 
     */
    public function getCreatedAt()
    {
        return $this->created_at;
    }

    /**
     * Set updated_at
     *
     * @param \DateTime $updatedAt
     * @return Story
     */
    public function setUpdatedAt($updatedAt)
    {
        $this->updated_at = $updatedAt;

        return $this;
    }

    /**
     * Get updated_at
     *
     * @return \DateTime 
     */
    public function getUpdatedAt()
    {
        return $this->updated_at;
    }
    
    /**
     * @ORM\PrePersist
     */
    public function setCreatedAtValue()
    {
    	$this->setUpdatedAt(new \DateTime());
		if ($this->getCreatedAt() == null) 
    	{
    		$this->setCreatedAt(new \DateTime());
    	}
    }

    /**
     * @ORM\PreUpdate
     */
    public function setUpdatedAtValue()
    {
    	$this->setUpdatedAt(new \DateTime());
    }

    /**
     * Set user
     *
     * @param \Fiction\UserBundle\Entity\User $user
     * @return Story
     */
    /* @TODO
    public function setUser(\Fiction\UserBundle\Entity\User $user = null)
    {
        $this->user = $user;

        return $this;
    }
    */

    /**
     * Get user
     *
     * @return \Fiction\UserBundle\Entity\User 
     */
     /* @TODO
    public function getUser()
    {
        return $this->user;
    }
    */
    
    /**
     * Add categories
     *
     * @param \Fiction\StoryBundle\Entity\StoryCategory $categories
     * @return Story
     */
    public function addStoryCategory(\Fiction\StoryBundle\Entity\StoryCategory $categories)
    {
        $this->categories[] = $categories;

        return $this;
    }

    /**
     * Remove categories
     *
     * @param \Fiction\StoryBundle\Entity\StoryCategory $categories
     */
    public function removeStoryCategory(\Fiction\StoryBundle\Entity\StoryCategory $categories)
    {
        $this->categories->removeElement($categories);
    }

    /**
     * Get categories
     *
     * @return \Doctrine\Common\Collections\Collection 
     */
    public function getStoryCategories()
    {
        return $this->categories;
    }

    /**
     * Set world
     *
     * @param \Fiction\WorldBundle\Entity\World $world
     * @return Story
     */
    public function setWorld(\Fiction\WorldBundle\Entity\World $world = null)
    {
        $this->world = $world;

        return $this;
    }

    /**
     * Get world
     *
     * @return \Fiction\WorldBundle\Entity\World 
     */
    public function getWorld()
    {
        return $this->world;
    }

    /**
     * Add children
     *
     * @param \Fiction\WorldBundle\Entity\World $children
     * @return World
     */
    /* @TODO
    public function addChild(\Fiction\WorldBundle\Entity\World $children)
    {
        $this->children[] = $children;

        return $this;
    }
    */

    /**
     * Remove children
     *
     * @param \Fiction\WorldBundle\Entity\World $children
     */
     /* @TODO
    public function removeChild(\Fiction\WorldBundle\Entity\World $children)
    {
        $this->children->removeElement($children);
    }
    */

    /**
     * Get children
     *
     * @return \Doctrine\Common\Collections\Collection 
     */
     /* @TODO
    public function getChildren()
    {
        return $this->children;
    }
    */

    /**
     * Add parents
     *
     * @param \Fiction\WorldBundle\Entity\World $parents
     * @return World
     */
     /* @TODO
    public function addParent(\Fiction\WorldBundle\Entity\World $parents)
    {
        $this->parents[] = $parents;

        return $this;
    }
    */

    /**
     * Remove parents
     *
     * @param \Fiction\WorldBundle\Entity\World $parents
     */
     /* @TODO
    public function removeParent(\Fiction\WorldBundle\Entity\World $parents)
    {
        $this->parents->removeElement($parents);
    }
    */

    /**
     * Get parents
     *
     * @return \Doctrine\Common\Collections\Collection 
     */
     /* @TODO
    public function getParents()
    {
        return $this->parents;
    }
    */


    /**
     * Set wordCount
     *
     * @param integer $wordCount
     *
     * @return Story
     */
    public function setWordCount($wordCount)
    {
        $this->word_count = $wordCount;

        return $this;
    }

    /**
     * Get wordCount
     *
     * @return integer
     */
    public function getWordCount()
    {
        return $this->word_count;
    }
}
