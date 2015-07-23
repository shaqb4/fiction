<?php
namespace Fiction\FandomBundle\Form\Type;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Fiction\FandomBundle\Form\Type\FandomParentType;
use Fiction\MarkdownEditorBundle\Form\Type\MarkdownType;
use Fiction\FandomBundle\Form\DataTransformer\ParentToNumberTransformer;

class FandomType extends AbstractType
{
	public function buildForm(FormBuilderInterface $builder, array $options)
	{		
		//$em = $options['em'];
		
		/*$builder->add(
				$builder->create('parents', 'collection', array(
				'type' => new FandomParentType(),
				'allow_add' => true,
				//'by_reference' => false,
				'allow_delete' => true))
				->addModelTransformer(new ParentToNumberTransformer($em))
		);*/
		$builder->add('parents', 'collection', array(
			'type' => 'fandom_parent',
			'allow_add' => true,
			//'by_reference' => false,
			'allow_delete' => true
		));
		
		$builder->add('title', 'text');
		$builder->add('fandom_type', 'entity', array(
				'class' => 'FictionFandomBundle:FandomType',
				'choice_label' => 'name'
		));
		$builder->add('categories', 'entity', array(
				'class' => 'FictionFandomBundle:Category',
				'choice_label' => 'name',
				'multiple' => true,
				'expanded' => true
		));
		$builder->add('description', 'pure_textarea', array(
			'attr' => array(
				'rows' => '10'				
			)
		));
		$builder->add('Save', 'submit');
	}

	public function configureOptions(OptionsResolver $resolver)
	{
		$resolver->setDefaults(array(
				'data_class' => 'Fiction\FandomBundle\Entity\Fandom',
				'csrf_protection' => true,
				'csrf_field_name' => '_token',
				// a unique key to help generate the secret token
				'intention'       => 'fandom_item',
		));
		/*->setRequired(array(
			'em'
		))
		->setAllowedTypes(array(
			'em' => 'Doctrine\Common\PersistenceManager'
		));*/
		//^^Must be updated for Symfony 2.7 if needed
	}

	public function getName()
	{
		return 'fandom';
	}
}