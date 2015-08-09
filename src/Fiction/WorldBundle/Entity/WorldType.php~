<?php

namespace Fiction\WorldBundle\Entity;

use Doctrine\ORM\Mapping as ORM;
use Doctrine\Common\Collections\ArrayCollection;

/**
 * WorldType
 */
class WorldType
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
    protected $worlds;

    /**
     * Construct
     */
    public function __construct()
    {
    	$this->worlds = new ArrayCollection();
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
     * @return WorldType
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
     * Add worlds
     *
     * @param \Fiction\WorldBundle\Entity\World $worlds
     * @return WorldType
     */
    public function addWorld(\Fiction\WorldBundle\Entity\World $worlds)
    {
        $this->worlds[] = $worlds;

        return $this;
    }

    /**
     * Remove worlds
     *
     * @param \Fiction\WorldBundle\Entity\World $worlds
     */
    public function removeWorld(\Fiction\WorldBundle\Entity\World $worlds)
    {
        $this->worlds->removeElement($worlds);
    }

    /**
     * Get worlds
     *
     * @return \Doctrine\Common\Collections\Collection 
     */
    public function getWorlds()
    {
        return $this->worlds;
    }
}
