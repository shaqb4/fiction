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
	protected $fandoms;
	
	/**
	 * Constructor
	 */
	public function __construct()
	{
		parent::__construct();
		
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
     * Add fandoms
     *
     * @param \Fiction\FandomBundle\Entity\Fandom $fandoms
     * @return User
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
