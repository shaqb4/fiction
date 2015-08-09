<?php
	
namespace Fiction\WorldBundle\Security\Authorization\Voter;
	
use Symfony\Component\Security\Core\Authorization\Voter\VoterInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\User\UserInterface;

class WorldVoter implements VoterInterface
{
	const EDIT = 'edit';
	const DELETE = 'delete';
	
	
	public function supportsAttribute($attribute)
	{
		return in_array($attribute, array(self::EDIT, self::DELETE));
	}
	
	public function supportsClass($class)
	{
		$supportedClass = "Fiction\WorldBundle\Entity\World";
		
		return $supportedClass === $class || is_subclass_of($class, $supportedClass);
	}
	
	public function vote(TokenInterface $token, $world, array $attributes)
	{
		if (!$this->supportsClass(get_class($world)))
		{
			return VoterInterface::ACCESS_ABSTAIN;
		}
		
		foreach ($attributes as $attribute)
		{
			if (!$this->supportsAttribute($attribute))
			{
				return VoterInterface::ACCESS_ABSTAIN;
			}
		}
		
		$user = $token->getUser();
		
		if (!$user instanceof UserInterface)
		{
			return VoterInterface::ACCESS_DENIED;
		}
		
		switch ($attribute)
		{
			case self::EDIT:
				if ($user->getId() == $world->getUser()->getId())
				{
					return VoterInterface::ACCESS_GRANTED;
				}
				break;
			case self::DELETE:
				if ($user->getId() == $world->getUser()->getId())
				{
					return VoterInterface::ACCESS_GRANTED;
				}
				break;
		}
		
		return VoterInterface::ACCESS_DENIED;
	}
}	