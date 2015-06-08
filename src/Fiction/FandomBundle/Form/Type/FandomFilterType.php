<?php
namespace Fiction\FandomBundle\Form\Type;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Fiction\FandomBundle\Form\Type\FandomParentType;
use Fiction\FandomBundle\Form\DataTransformer\ParentToNumberTransformer;

class FandomFilterType extends AbstractType
{
	public function buildForm(FormBuilderInterface $builder, array $options)
	{		
		$builder->add('title', 'text', array(
			'required' => false
		));
		$builder->add('fandom_type', 'entity', array(
				'class' => 'FictionFandomBundle:FandomType',
				'choice_label' => 'name',
				'required' => false,
				'placeholder' => 'Choose a type of Fandom'
		));
		$builder->add('categories', 'entity', array(
				'class' => 'FictionFandomBundle:Category',
				'choice_label' => 'name',
				'multiple' => true,
				'expanded' => true
		));
		$builder->add('description', 'textarea', array(
			'required' => false
		));
		$builder->add('Filter', 'submit');
	}

	public function configureOptions(OptionsResolver $resolver)
	{
		$resolver->setDefaults(array(
				'data_class' => 'Fiction\FandomBundle\Entity\Fandom',
				'csrf_protection' => false,
				'method' => 'GET',
				//'csrf_field_name' => '_token',
				// a unique key to help generate the secret token
				//'intention'       => 'fandom_item',
		));
	}

	public function getName()
	{
		return 'fandom_filter';
	}
}