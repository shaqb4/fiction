<?php
namespace Fiction\WorldBundle\Form\DataTransformer;

use Symfony\Component\Form\DataTransformerInterface;
use Symfony\Component\Form\Exception\TransformationFailedException;
use Doctrine\Common\Persistence\ObjectManager;
use Fiction\WorldBundle\Entity\World;

class ParentToNumberTransformer implements DataTransformerInterface
{
	/**
	 * 
	 * @var ObjectManager
	 */
	private $om;
	
	/**
	 * 
	 * @param ObjectManager $om
	 */
	public function __construct(ObjectManager $om)
	{
		$this->om = $om;
	}
	
	/**
	 * Transforms an object (world) to a string(number).
	 * 
	 * @param World|null $parent
	 * @return string
	 */
	public function transform($parent)
	{
		if (null === $parent)
		{
			return "";
		}
		
		return $parent->getId();
	}
	
	/**
	 * Transforms a string (number) to an object (issue).
	 *
	 * @param  string $number
	 *
	 * @return World|null
	 *
	 * @throws TransformationFailedException if object (world) is not found.
	 */
	public function reverseTransform($number)
	{
		if (!$number) {
			return null;
		}
	
		$parent = $this->om
		->getRepository('FictionWorldBundle:World')
		->findOneBy(array('id' => $number))
		;
	
		if (null === $parent) {
			throw new TransformationFailedException(sprintf(
					'A world with id "%s" does not exist!',
					$number
			));
		}
	
		return $parent;
	}
}