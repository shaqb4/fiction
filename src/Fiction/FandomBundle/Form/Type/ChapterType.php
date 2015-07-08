<?php
namespace Fiction\FandomBundle\Form\Type;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Fiction\FandomBundle\Entity\Fandom;
use Fiction\FandomBundle\Entity\Chapter;

class ChapterType extends AbstractType
{
	private $fandom;
	private $chapterNumber;
	private $isCreate;
	
	public function __construct(Fandom $fandom, $chapterNumber, $create = false)
	{
		$this->fandom = $fandom;
		$this->chapterNumber = $chapterNumber;
		$this->isCreate = $create;
	}
	
	public function buildForm(FormBuilderInterface $builder, array $options)
	{		
		$chapters = array();
		$lastChapter = sizeof($this->fandom->getChapters());
		if (!$this->isCreate)
		{
			for ($i = 1; $i <= $lastChapter; $i++)
			{
				$chapters[$i] = $i; 
			}
		}
		else
		{
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
		$builder->add('content', 'textarea', array(
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
				'data_class' => 'Fiction\FandomBundle\Entity\Chapter',
		));
	}

	public function getName()
	{
		return 'chapter';
	}
}