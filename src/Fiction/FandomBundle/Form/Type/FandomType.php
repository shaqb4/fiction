<?php
namespace Fiction\FandomBundle\Form\Type;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolverInterface;
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
				'property' => 'name'
		));
		$builder->add('categories', 'entity', array(
				'class' => 'FictionFandomBundle:Category',
				'property' => 'name',
				'multiple' => true,
				'expanded' => true
		));
		$builder->add('description', 'markdown');
		$builder->add('Save', 'submit');
	}

	public function setDefaultOptions(OptionsResolverInterface $resolver)
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
	}

	public function getName()
	{
		return 'fandom';
	}
}