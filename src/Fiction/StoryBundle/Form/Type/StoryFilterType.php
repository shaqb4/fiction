<?php
namespace Fiction\StoryBundle\Form\Type;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

class StoryFilterType extends AbstractType
{
	public function buildForm(FormBuilderInterface $builder, array $options)
	{		
		$builder->add('title', 'text', array(
			'required' => false
		));
		
		$builder->add('categories', 'entity', array(
				'class' => 'FictionStoryBundle:StoryCategory',
				'choice_label' => 'name',
				'multiple' => true,
				'expanded' => true,
                'required' => false
		));
		$builder->add('description', 'textarea', array(
			'required' => false
		));
		$builder->add('Filter', 'submit');
	}

	public function configureOptions(OptionsResolver $resolver)
	{
		$resolver->setDefaults(array(
				'data_class' => 'Fiction\StoryBundle\Entity\Story',
				'csrf_protection' => false,
				'method' => 'GET',
                'validation_groups' => false //No validation for this form 
				//'csrf_field_name' => '_token',
				// a unique key to help generate the secret token
				//'intention'       => 'world_item',
		));
	}

	public function getName()
	{
		return 'story_filter';
	}
}