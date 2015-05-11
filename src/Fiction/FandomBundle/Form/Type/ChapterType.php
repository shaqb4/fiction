<?php
namespace Fiction\FandomBundle\Form\Type;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolverInterface;
use Fiction\FandomBundle\Entity\Fandom;
use Fiction\FandomBundle\Entity\Chapter;

class ChapterType extends AbstractType
{
	private $fandom;
	private $chapter;
	
	public function __construct(Fandom $fandom, $chapterNumber)
	{
		$this->fandom = $fandom;
		$this->chapterNumber = $chapterNumber;
	}
	
	public function buildForm(FormBuilderInterface $builder, array $options)
	{		
		$chapters = array();
		
		for ($i = 1; $i <= sizeof($this->fandom->getChapters()); $i++)
		{
			$chapters[$i] = $i; 
		}
		
		$builder->add('title', 'text');
		$builder->add('chapter_number', 'choice', array(
			'choices' => $chapters,
			'multiple' => false,
			'expanded' => false,
			'data' =>	$this->chapterNumber
		));
		$builder->add('content', 'markdown');
		$builder->add('save', 'submit');
	}

	public function setDefaultOptions(OptionsResolverInterface $resolver)
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