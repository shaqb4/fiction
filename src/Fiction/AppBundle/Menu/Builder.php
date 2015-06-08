<?php
namespace Fiction\AppBundle\Menu;

use Knp\Menu\FactoryInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authorization\AuthorizationChecker;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorage;

class Builder
{
	private $factory;
	private $authChecker;
	private $tokStorage;
	
	public function __construct(FactoryInterface $factory, AuthorizationChecker $auth, TokenStorage $token)
	{
		$this->factory = $factory;
		$this->authChecker = $auth;
		$this->tokStorage = $token;
	}
	
	public function leftNav(Request $request)//, array $options)
	{
		$menu = $this->factory->createItem('root');
		
		/*$layout = $menu->addChild('Home', array(
				'icon' => 'home',
				'route' => 'homepage',
		));*/
		
		$dropdown = $menu->addChild('Find', array(
				'dropdown' => true,
				'caret' => true,
		));
		
		$dropdown->addChild('Fandoms', array(
				'route' => 'find_fandom', 'routeParameters' => array('page' => 1)));
		$dropdown->addChild('Communities', array('route' => 'find_community'));
		
		return $menu;
	}
	
	public function rightNav(Request $request)//, array $options)
	{
		$menu = $this->factory->createItem('root');
	
		if ($this->authChecker->isGranted('IS_AUTHENTICATED_REMEMBERED'))
		{
			$user = $this->tokStorage->getToken()->getUser();
			$dropdown = $menu->addChild($user->getUsername(), array(
					'icon' => 'glyphicon-user',
					'dropdown' => true,
					'caret' => true
			));
			
			$dropdown->addChild('Profile', array('route' => 'fos_user_profile_show'));
			$dropdown->addChild('Fandoms', array(
					'route' => 'user_fandoms'));
			$dropdown->addChild('Communities', array('route' => 'user_communities'));
			$dropdown->addChild('d1', array('attributes' => array('divider' => true)));
			$dropdown->addChild('Sign Out', array('route' => 'fos_user_security_logout'));
		}
		else
		{
			$menu->addChild('Login', array('route' => 'fos_user_security_login'));
		}
		return $menu;
	}
}