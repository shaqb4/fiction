<?php
namespace Fiction\UserBundle\Entity;

use FOS\UserBundle\Model\User as BaseUser;
use Doctrine\ORM\Mapping as ORM;
use Doctrine\Common\Collections\ArrayCollection;

/**
 * User
 * @author Shahked Bleicher
 *
 */
class User extends BaseUser
{
	/**
	 * @var integer
	 */
	protected $id;
	
	/**
	 * @var datetime
	 */
	protected $created_at;
	
	/**
	 * 
	 * @var ArrayCollection
	 */
	protected $worlds;
	
	/**
	 * Constructor
	 */
	public function __construct()
	{
		parent::__construct();
		
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
     * @ORM\PrePersist
     */
    public function setCreatedAtValue()
    {
    	if ($this->getCreatedAt() == null)
    	{
    		$this->setCreatedAt(new \DateTime());
    	}
    }

    /**
     * Set created_at
     *
     * @param \DateTime $createdAt
     * @return User
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
     * Add worlds
     *
     * @param \Fiction\WorldBundle\Entity\World $worlds
     * @return User
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
