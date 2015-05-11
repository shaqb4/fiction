<?php

namespace Fiction\FandomBundle\Entity;

use Doctrine\ORM\Mapping as ORM;
use Doctrine\Common\Collections\ArrayCollection;

/**
 * Fandom
 */
class Fandom
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
     * @var \Fiction\FandomBundle\Entity\Category
     */
    protected $categories;
    
    /**
     * 
     * @var \Fiction\FandomBundle\Entity\FandomType
     */
    protected $fandom_type;
    
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
     * @return Fandom
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
     * @return Fandom
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
     * @param \Fiction\FandomBundle\Entity\Chapter $chapters
     * @return Fandom
     */
    public function addChapter(\Fiction\FandomBundle\Entity\Chapter $chapters)
    {
        $this->chapters[] = $chapters;

        return $this;
    }

    /**
     * Remove chapters
     *
     * @param \Fiction\FandomBundle\Entity\Chapter $chapters
     */
    public function removeChapter(\Fiction\FandomBundle\Entity\Chapter $chapters)
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
     * @return Fandom
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
     * @return Fandom
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
     * @return Fandom
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
     * @param \Fiction\FandomBundle\Entity\Category $categories
     * @return Fandom
     */
    public function addCategory(\Fiction\FandomBundle\Entity\Category $categories)
    {
        $this->categories[] = $categories;

        return $this;
    }

    /**
     * Remove categories
     *
     * @param \Fiction\FandomBundle\Entity\Category $categories
     */
    public function removeCategory(\Fiction\FandomBundle\Entity\Category $categories)
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
     * Set fandom_type
     *
     * @param \Fiction\FandomBundle\Entity\FandomType $fandomType
     * @return Fandom
     */
    public function setFandomType(\Fiction\FandomBundle\Entity\FandomType $fandomType = null)
    {
        $this->fandom_type = $fandomType;

        return $this;
    }

    /**
     * Get fandom_type
     *
     * @return \Fiction\FandomBundle\Entity\FandomType 
     */
    public function getFandomType()
    {
        return $this->fandom_type;
    }

    /**
     * Add children
     *
     * @param \Fiction\FandomBundle\Entity\Fandom $children
     * @return Fandom
     */
    public function addChild(\Fiction\FandomBundle\Entity\Fandom $children)
    {
        $this->children[] = $children;

        return $this;
    }

    /**
     * Remove children
     *
     * @param \Fiction\FandomBundle\Entity\Fandom $children
     */
    public function removeChild(\Fiction\FandomBundle\Entity\Fandom $children)
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
     * @param \Fiction\FandomBundle\Entity\Fandom $parents
     * @return Fandom
     */
    public function addParent(\Fiction\FandomBundle\Entity\Fandom $parents)
    {
        $this->parents[] = $parents;

        return $this;
    }

    /**
     * Remove parents
     *
     * @param \Fiction\FandomBundle\Entity\Fandom $parents
     */
    public function removeParent(\Fiction\FandomBundle\Entity\Fandom $parents)
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
}
