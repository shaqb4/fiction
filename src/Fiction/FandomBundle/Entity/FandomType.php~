<?php

namespace Fiction\FandomBundle\Entity;

use Doctrine\ORM\Mapping as ORM;
use Doctrine\Common\Collections\ArrayCollection;

/**
 * FandomType
 */
class FandomType
{
    /**
     * @var integer
     */
    private $id;

    /**
     * @var string
     */
    private $name;

    /**
     *
     * @var ArrayCollection
     */
    protected $fandoms;

    /**
     * Construct
     */
    public function __construct()
    {
    	$this->fandoms = new ArrayCollection();
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
     * Set name
     *
     * @param string $name
     * @return FandomType
     */
    public function setName($name)
    {
        $this->name = $name;

        return $this;
    }

    /**
     * Get name
     *
     * @return string 
     */
    public function getName()
    {
        return $this->name;
    }

    /**
     * Add fandoms
     *
     * @param \Fiction\FandomBundle\Entity\Fandom $fandoms
     * @return FandomType
     */
    public function addFandom(\Fiction\FandomBundle\Entity\Fandom $fandoms)
    {
        $this->fandoms[] = $fandoms;

        return $this;
    }

    /**
     * Remove fandoms
     *
     * @param \Fiction\FandomBundle\Entity\Fandom $fandoms
     */
    public function removeFandom(\Fiction\FandomBundle\Entity\Fandom $fandoms)
    {
        $this->fandoms->removeElement($fandoms);
    }

    /**
     * Get fandoms
     *
     * @return \Doctrine\Common\Collections\Collection 
     */
    public function getFandoms()
    {
        return $this->fandoms;
    }
}
