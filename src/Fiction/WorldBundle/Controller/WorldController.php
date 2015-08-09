<?php

namespace Fiction\WorldBundle\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\Request;
use Fiction\WorldBundle\Entity\World;
use Fiction\WorldBundle\Entity\Chapter;
use Fiction\WorldBundle\Form\Type\WorldType;
use Fiction\WorldBundle\Form\Type\WorldFilterType;
use Doctrine\Common\Collections\ArrayCollection;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

class WorldController extends Controller
{
    public function createWorldAction(Request $request)
    {
    	$world = new World();
    	$world->setTitle('World Title...');
    	$world->setDescription('A mindblowing World summary or description...');
    	$world->setUser($this->get('security.token_storage')->getToken()->getUser());
    	
    	$form = $this->createForm(new WorldType(), $world, array(
            'method' => 'POST'
        ));
    	
    	$form->handleRequest($request);
    	
    	if ($form->isSubmitted() && $form->isValid())
    	{
            $world->setWordCount(0);
            
    		$em = $this->getDoctrine()->getManager();
    		$em->persist($world);
    		$em->flush();
            
            return $this->redirect($this->generateUrl('edit_world', array(
    					'worldId' => $world->getId() 
    				))
    		);
    	}
    	
        return $this->render('FictionWorldBundle:World:create.html.twig', array(
        	'form' => $form->createView()
        ));
    }
    
    public function findWorldsAction(Request $request, $page = 1)
    {
    	
    	$repository = $this->getDoctrine()->getRepository('FictionWorldBundle:World');
    	
    	$form = $this->createForm(new WorldFilterType(), null, array(
            'method' => 'GET'
        ));
    	
    	$form->handleRequest($request);
    	if ($form->isSubmitted() && $form->isValid()) {
    		$data = $form->getData();
    		
    		$page = 1;
    		
    		$worlds = $repository->getFilteredWorld($data, 2, $page);
    		
    		$totalWorlds = $repository->getTotalFilteredWorlds($data);
    		
    	}
    	else
    	{
    		$worlds = $repository->findWorlds(2, $page);
    		
    		$totalWorlds = $repository->getTotalWorlds();
    	}
    	
    	$paginator = new \lib\Paginator($page, $totalWorlds, 2);
    	$pageList = $paginator->getPageList();
    	
    	// parameters to template
    	return $this->render('FictionWorldBundle:World:find_worlds.html.twig', array(
    		'worlds' => $worlds, 'paginator' => $pageList, 'page' => $page,
    		'form' => $form->createView()
    	));
    }
    
    public function viewWorldChildrenAction(Request $request, $worldId, $page)
    {
    	$repository = $this->getDoctrine()->getRepository('FictionWorldBundle:World');
    	$worlds = $repository->findChildWorlds($worldId, 2, $page);
    
    	if (!$worlds)
    	{
    		$flash = $this->get('braincrafted_bootstrap.flash');
	    	
	    	$flash->error('This World doesn\'t have any World that extend it.');
    	}
    	
    	$totalChildren = $repository->getTotalChildWorlds($worldId);
    	
    	$paginator = new \lib\Paginator($page, $totalChildren, 2);
    	$pageList = $paginator->getPageList();
    
    	return $this->render('FictionWorldBundle:World:view_world_children.html.twig', array(
    			'worlds' => $worlds, 'paginator' => $pageList, 'page' => $page, 'worldId' => $worldId
    	));
    }
    
    public function editWorldAction(Request $request, $worldId)
    {
    	$repository = $this->getDoctrine()->getRepository('FictionWorldBundle:World');
        $world = $repository->findOneById($worldId);
        
        if ($this->get('security.authorization_checker')->isGranted('edit', $world) === false)
        {
            $request->getSession()->getFlashBag()->add(
				'error',
				'Oops! You don\'t have permission to edit this world. 
	    			You can view your worlds in your <a href=\''.$this->generateUrl('user_worlds').'\'>profile</a>!'
			);
	    	
	    	return $this->render('FictionAppBundle::error.html.twig', array());
        } 
        
    	$originalParents = new ArrayCollection();
    	
    	foreach ($world->getParents() as $parent) {
    		$originalParents->add($parent);
    	}
    	
    	if ($world->getWorldType()->getId() === 1)
    	{
	    	/**
	    	 * Create a form so the user can edit an individual chapter
	    	 */
	    	$chapterEditForm = $this->createFormBuilder()
	    	->setMethod('GET')
	    	->add('chapters', 'entity', array(
	    			'class' => 'FictionWorldBundle:Chapter',
	    			'choices' => $this->getDoctrine()->getRepository('FictionWorldBundle:Chapter')->getAllWorldChapters($world),
	    			'choice_label' => 'title'
	    	))
	    	->getForm();
	    	
	    	$chapterEditForm->handleRequest($request);
	    	 
	    	if ($chapterEditForm->isSubmitted() && $chapterEditForm->isValid())
	    	{
	    		$newChapter = $chapterEditForm->get('chapters')->getData();
	    		return $this->redirect($this->generateUrl('edit_chapter', array(
	    				'worldId' => $worldId, 'chapterNumber' => $newChapter->getChapterNumber())));
	    	}
	    	else 
	    	{
	    		$chapterEditForm = $chapterEditForm->createView();
	    	}
    	}
    	else
    	{
    		$chapterEditForm = null;
    	}    	
    	
    	/**
    	 * Create a form to edit general world info (i.e. title, description, parents)
    	 */
    	$form = $this->createForm(new WorldType(), $world, array(
            'method' => 'PUT'
        ));
    	 
    	$form->handleRequest($request);
    	 
    	if ($form->isSubmitted() && $form->isValid())
    	{
    		$em = $this->getDoctrine()->getManager();
    		
    		foreach($originalParents as $parent)
    		{
    			if (false === $world->getParents()->contains($parent))
    			{
    				$parent->getChildren()->removeElement($world);
    				
    				$em->persist($parent);
    			}
    		}
    		
    		$em->persist($world);
    		
    		$em->flush();
    	}
    	 
    	return $this->render('FictionWorldBundle:World:edit.html.twig', array(
    			'form' => $form->createView(),
    			'chapterForm' => $chapterEditForm,
                'world_id' => $worldId
    	));
    }
    
    public function viewWorldAction(Request $request, $worldId)
    {
    	$repository = $this->getDoctrine()->getRepository('FictionWorldBundle:World');
    	$world = $repository->findOneById($worldId);
    	
    	if (!$world)
    	{
    		throw $this->createNotFoundException("This World does not exist");
    	}
    	
    	return $this->render('FictionWorldBundle:World:view_world.html.twig', array(
    			'world' => $world
    	));
    }
    
    public function userWorldsAction()
    {
    	$user = $this->get('security.token_storage')->getToken()->getUser();
    	$worlds = $user->getWorlds();
    	 
    	// parameters to template
    	return $this->render('FictionWorldBundle:World:user_worlds.html.twig', array(
    			'worlds' => $worlds
    	));
    }
    
    public function deleteWorldAction(Request $request, $worldId)
    {
        
        $world = $this->getDoctrine()->getRepository('FictionWorldBundle:World')->findOneById($worldId);
        
        if ($this->get('security.authorization_checker')->isGranted('delete', $world) === false)
        {
            $request->getSession()->getFlashBag()->add(
				'error',
				'Oops! You don\'t have permission to delete this world. 
	    			You can view your worlds in your <a href=\''.$this->generateUrl('user_worlds').'\'>profile</a>!'
			);
	    	
	    	return $this->render('FictionAppBundle::error.html.twig', array());
        } 
        
        //delete the world
        
        //Redirect to the user worlds page
        return $this->redirect($this->generateUrl('user_worlds', 302));
        
    }
    
    public function deleteConfirmWorldAction(Request $request, $worldId)
    {
        $world = $this->getDoctrine()->getRepository('FictionWorldBundle:World')->findOneById($worldId);
        
        if ($this->get('security.authorization_checker')->isGranted('delete', $world) === false)
        {
            $request->getSession()->getFlashBag()->add(
				'error',
				'Oops! You don\'t have permission to delete this world. 
	    			You can view your worlds in your <a href=\''.$this->generateUrl('user_worlds').'\'>profile</a>!'
			);
	    	
	    	return $this->render('FictionAppBundle::error.html.twig', array());
        } 
        
        $user = $this->get('security.token_storage')->getToken()->getUser();
        return $this->render('FictionWorldBundle:World:delete_confirm.html.twig', array(
    			'worldId' => $worldId
    	));
    }
}
