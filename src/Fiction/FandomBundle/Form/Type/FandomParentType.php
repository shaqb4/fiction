<?php
namespace Fiction\FandomBundle\Form\Type;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Fiction\FandomBundle\Form\DataTransformer\ParentToNumberTransformer;
use Doctrine\Common\Persistence\ObjectManager;

class FandomParentType extends AbstractType
{
	/**
	 * @var ObjectManager
	 */
	private $om;
	
	/**
	 * @param ObjectManager $om
	 */
	public function __construct(ObjectManager $om)
	{
		$this->om = $om;
	}
	
	public function buildForm(FormBuilderInterface $builder, array $options)
	{
		$transformer = new ParentToNumberTransformer($this->om);
		$builder->addModelTransformer($transformer);
		//$builder->add('id', 'text');
		
		//$builder->add('Add', 'submit');
	}

	public function configureOptions(OptionsResolver $resolver)
	{
		$resolver->setDefaults(array(
				//'data_class' => 'Fiction\FandomBundle\Entity\Fandom',
				'invalid_message' => 'The selected fandom does not exist'
		));
	}

	public function getParent()
	{
		return 'text';
	}
	
	public function getName()
	{
		return 'fandom_parent';
	}
}