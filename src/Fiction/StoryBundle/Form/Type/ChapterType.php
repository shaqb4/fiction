<?php
namespace Fiction\StoryBundle\Form\Type;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Fiction\StoryBundle\Entity\Story;
use Fiction\StoryBundle\Entity\Chapter;

class ChapterType extends AbstractType
{
	private $story;
	private $chapterNumber;
	private $isCreate;
	
	public function __construct(Story $story, $chapterNumber, $create = false)
	{
		$this->story = $story;
		$this->chapterNumber = $chapterNumber;
		$this->isCreate = $create;
	}
	
	public function buildForm(FormBuilderInterface $builder, array $options)
	{		
		$chapters = array();
		$lastChapter = sizeof($this->story->getChapters());

		if (!$this->isCreate)
		{
            //If editing an existing chapter, make a list containing the index of all chapters
			for ($i = 1; $i <= $lastChapter; $i++)
			{
				$chapters[$i] = $i; 
			}
		}
		else
		{
            //If creating a new chapter, just set the chapter number to the last chapter + 1
			$lastChapter++;
			$this->chapterNumber = $lastChapter;
			$chapters[$lastChapter] = $lastChapter;
		}
		
		$builder->add('title', 'text');
		$builder->add('chapter_number', 'choice', array(
			'choices' => $chapters,
			'multiple' => false,
			'expanded' => false,
			'data' =>	$this->chapterNumber
		));
		$builder->add('content', 'pure_textarea', array(
			'attr' => array(
				'class' => 'tinymce',
				'data-theme' => 'story'				
			)
		));
		$builder->add('save', 'submit');
	}

	public function configureOptions(OptionsResolver $resolver)
	{
		$resolver->setDefaults(array(
				'data_class' => 'Fiction\StoryBundle\Entity\Chapter',
		));
	}

	public function getName()
	{
		return 'chapter';
	}
}