<?php
	
namespace Fiction\FandomBundle\Security\Authorization\Voter;
	
use Symfony\Component\Security\Core\Authorization\Voter\VoterInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\User\UserInterface;

class FandomVoter implements VoterInterface
{
	const EDIT = 'edit';
	const DELETE = 'delete';
	
	
	public function supportsAttribute($attribute)
	{
		return in_array($attribute, array(self::EDIT, self::DELETE));
	}
	
	public function supportsClass($class)
	{
		$supportedClass = "Fiction\FandomBundle\Entity\Fandom";
		
		return $supportedClass === $class || is_subclass_of($class, $supportedClass);
	}
	
	public function vote(TokenInterface $token, $fandom, array $attributes)
	{
		if (!$this->supportsClass(get_class($fandom)))
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
				if ($user->getId() == $fandom->getUser()->getId())
				{
					return VoterInterface::ACCESS_GRANTED;
				}
				break;
			case self::DELETE:
				if ($user->getId() == $fandom->getUser()->getId())
				{
					return VoterInterface::ACCESS_GRANTED;
				}
				break;
		}
		
		return VoterInterface::ACCESS_DENIED;
	}
}	