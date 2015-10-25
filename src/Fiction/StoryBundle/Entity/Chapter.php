<?php

namespace Fiction\StoryBundle\Entity;

use Doctrine\ORM\Mapping as ORM;

/**
 * Chapter
 */
class Chapter
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
    private $content;
    
    /**
     * @var \Fiction\StoryBundle\Entity\Story
     */
	protected $story;
	
	/**
     * @var \DateTime
     */
    private $created_at;

    /**
     * @var \DateTime
     */
    private $updated_at;
    
    /**
     * @var integer
     */
    private $chapter_number;

    /**
    *
    * @var integer
    */
    private $word_count;
    
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
     * @return Chapter
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
     * Set content
     *
     * @param string $content
     * @return Chapter
     */
    public function setContent($content)
    {
        $this->content = $content;

        return $this;
    }

    /**
     * Get content
     *
     * @return string 
     */
    public function getContent()
    {
        return $this->content;
    }

    /**
     * Set story
     *
     * @param \Fiction\StoryBundle\Entity\Story $story
     * @return Chapter
     */
    public function setStory(\Fiction\StoryBundle\Entity\Story $story = null)
    {
        $this->story = $story;

        return $this;
    }

    /**
     * Get story
     *
     * @return \Fiction\StoryBundle\Entity\Story 
     */
    public function getStory()
    {
        return $this->story;
    }

    /**
     * Set created_at
     *
     * @param \DateTime $createdAt
     * @return Chapter
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
     * @return Chapter
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
     * Set chapter_number
     *
     * @param integer $chapterNumber
     * @return Chapter
     */
    public function setChapterNumber($chapterNumber)
    {
        $this->chapter_number = $chapterNumber;

        return $this;
    }

    /**
     * Get chapter_number
     *
     * @return integer 
     */
    public function getChapterNumber()
    {
        return $this->chapter_number;
    }

    /**
     * Set wordCount
     *
     * @param integer $wordCount
     *
     * @return Chapter
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
