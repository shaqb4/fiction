<?php

namespace Fiction\WorldBundle\Entity;

use Doctrine\ORM\Mapping as ORM;
use Doctrine\Common\Collections\ArrayCollection;

/**
 * World
 */
class World
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
     */
    protected $user;
    
    /**
     * 
     * @var \Fiction\WorldBundle\Entity\Category
     */
    protected $categories;
    
    /**
     * 
     * @var \Fiction\WorldBundle\Entity\WorldType
     */
    protected $world_type;
    
    /**
     * 
     * @var ArrayCollection
     */
    protected $parents;
    
    /**
     * 
     * @var ArrayCollection
     */
    protected $children;
    
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
    	$this->parents = new ArrayCollection();
    	$this->children = new ArrayCollection();
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
     * @return World
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
     * @return World
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
     * @param \Fiction\WorldBundle\Entity\Chapter $chapters
     * @return World
     */
    public function addChapter(\Fiction\WorldBundle\Entity\Chapter $chapters)
    {
        $this->chapters[] = $chapters;

        return $this;
    }

    /**
     * Remove chapters
     *
     * @param \Fiction\WorldBundle\Entity\Chapter $chapters
     */
    public function removeChapter(\Fiction\WorldBundle\Entity\Chapter $chapters)
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
     * @return World
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
     * @return World
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
     * @return World
     */
    public function setUser(\Fiction\UserBundle\Entity\User $user = null)
    {
        $this->user = $user;

        return $this;
    }

    /**
     * Get user
     *
     * @return \Fiction\UserBundle\Entity\User 
     */
    public function getUser()
    {
        return $this->user;
    }

    /**
     * Add categories
     *
     * @param \Fiction\WorldBundle\Entity\Category $categories
     * @return World
     */
    public function addCategory(\Fiction\WorldBundle\Entity\Category $categories)
    {
        $this->categories[] = $categories;

        return $this;
    }

    /**
     * Remove categories
     *
     * @param \Fiction\WorldBundle\Entity\Category $categories
     */
    public function removeCategory(\Fiction\WorldBundle\Entity\Category $categories)
    {
        $this->categories->removeElement($categories);
    }

    /**
     * Get categories
     *
     * @return \Doctrine\Common\Collections\Collection 
     */
    public function getCategories()
    {
        return $this->categories;
    }

    /**
     * Set world_type
     *
     * @param \Fiction\WorldBundle\Entity\WorldType $worldType
     * @return World
     */
    public function setWorldType(\Fiction\WorldBundle\Entity\WorldType $worldType = null)
    {
        $this->world_type = $worldType;

        return $this;
    }

    /**
     * Get world_type
     *
     * @return \Fiction\WorldBundle\Entity\WorldType 
     */
    public function getWorldType()
    {
        return $this->world_type;
    }

    /**
     * Add children
     *
     * @param \Fiction\WorldBundle\Entity\World $children
     * @return World
     */
    public function addChild(\Fiction\WorldBundle\Entity\World $children)
    {
        $this->children[] = $children;

        return $this;
    }

    /**
     * Remove children
     *
     * @param \Fiction\WorldBundle\Entity\World $children
     */
    public function removeChild(\Fiction\WorldBundle\Entity\World $children)
    {
        $this->children->removeElement($children);
    }

    /**
     * Get children
     *
     * @return \Doctrine\Common\Collections\Collection 
     */
    public function getChildren()
    {
        return $this->children;
    }

    /**
     * Add parents
     *
     * @param \Fiction\WorldBundle\Entity\World $parents
     * @return World
     */
    public function addParent(\Fiction\WorldBundle\Entity\World $parents)
    {
        $this->parents[] = $parents;

        return $this;
    }

    /**
     * Remove parents
     *
     * @param \Fiction\WorldBundle\Entity\World $parents
     */
    public function removeParent(\Fiction\WorldBundle\Entity\World $parents)
    {
        $this->parents->removeElement($parents);
    }

    /**
     * Get parents
     *
     * @return \Doctrine\Common\Collections\Collection 
     */
    public function getParents()
    {
        return $this->parents;
    }


    /**
     * Set wordCount
     *
     * @param integer $wordCount
     *
     * @return World
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
