<?php
namespace Fiction\FandomBundle\Form\DataTransformer;

use Symfony\Component\Form\DataTransformerInterface;
use Symfony\Component\Form\Exception\TransformationFailedException;
use Doctrine\Common\Persistence\ObjectManager;
use Fiction\FandomBundle\Entity\Fandom;

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
	 * Transforms an object (fandom) to a string(number).
	 * 
	 * @param Fandom|null $parent
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
	 * @return Fandom|null
	 *
	 * @throws TransformationFailedException if object (fandom) is not found.
	 */
	public function reverseTransform($number)
	{
		if (!$number) {
			return null;
		}
	
		$parent = $this->om
		->getRepository('FictionFandomBundle:Fandom')
		->findOneBy(array('id' => $number))
		;
	
		if (null === $parent) {
			throw new TransformationFailedException(sprintf(
					'A fandom with id "%s" does not exist!',
					$number
			));
		}
	
		return $parent;
	}
}