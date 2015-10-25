<?php

namespace Fiction\StoryBundle\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\Request;
use Fiction\WorldBundle\Entity\World;
use Fiction\StoryBundle\Entity\Chapter;
use Fiction\StoryBundle\Entity\Story;
use Fiction\StoryBundle\Form\Type\StoryType;
use Fiction\StoryBundle\Form\Type\StoryFilterType;
use Doctrine\Common\Collections\ArrayCollection;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

class StoryController extends Controller
{
    public function createStoryAction(Request $request)
    {
    	$story = new Story();
    	$story->setTitle('Story Title...');
    	$story->setDescription('A mindblowing Story summary or description...');
    	$story->setUser($this->get('security.token_storage')->getToken()->getUser());
    	
    	$form = $this->createForm(new StoryType(), $story, array(
            'method' => 'POST'
        ));
    	
    	$form->handleRequest($request);
    	
    	if ($form->isSubmitted() && $form->isValid())
    	{
            $story->setWordCount(0);
            
    		$em = $this->getDoctrine()->getManager();
    		$em->persist($story);
    		$em->flush();
            
            return $this->redirect($this->generateUrl('edit_story', array(
    					'storyId' => $story->getId() 
    				))
    		);
    	}
    	
        return $this->render('FictionStoryBundle:Story:create.html.twig', array(
        	'form' => $form->createView()
        ));
    }
    
    public function findStoriesAction(Request $request, $page = 1)
    {
    	
    	$repository = $this->getDoctrine()->getRepository('FictionStoryBundle:Story');
    	
    	$form = $this->createForm(new StoryFilterType(), null, array(
            'method' => 'GET'
        ));
    	
    	$form->handleRequest($request);
    	if ($form->isSubmitted() && $form->isValid()) {
    		$data = $form->getData();
    		
    		$page = 1;
    		
    		$stories = $repository->getFilteredStories($data, 2, $page);
    		
    		$totalStories = $repository->getTotalFilteredStories($data);
    		
    	}
    	else
    	{
    		$stories = $repository->findStories(2, $page);
    		
    		$totalStories = $repository->getTotalStories();
    	}
    	
    	$paginator = new \lib\Paginator($page, $totalStories, 2);
    	$pageList = $paginator->getPageList();
    	
    	// parameters to template
    	return $this->render('FictionStoryBundle:Story:find_stories.html.twig', array(
    		'stories' => $stories, 'paginator' => $pageList, 'page' => $page,
    		'form' => $form->createView()
    	));
    }
    
    /*public function viewWorldChildrenAction(Request $request, $worldId, $page)
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
    }*/
    
    public function editStoryAction(Request $request, $storyId)
    {
    	$repository = $this->getDoctrine()->getRepository('FictionStoryBundle:Story');
        $story = $repository->findOneById($storyId);
        
        if ($this->get('security.authorization_checker')->isGranted('edit', $story->getWorld()) === false)
        {
            $request->getSession()->getFlashBag()->add(
				'error',
				'Oops! You don\'t have permission to edit this story. 
	    			You can view your stories in your <a href=\''.$this->generateUrl('user_worlds').'\'>profile</a>!'
			);
	    	
	    	return $this->render('FictionAppBundle::error.html.twig', array());
        } 
        
    	/*$originalParents = new ArrayCollection();
    	
    	foreach ($world->getParents() as $parent) {
    		$originalParents->add($parent);
    	}*/
    	
    	//if ($world->getWorldType()->getId() === 1)
    	//{
	    	/**
	    	 * Create a form so the user can edit an individual chapter
	    	 */
	    	$chapterEditForm = $this->createFormBuilder()
	    	->setMethod('GET')
	    	->add('chapters', 'entity', array(
	    			'class' => 'FictionStoryBundle:Chapter',
	    			'choices' => $this->getDoctrine()->getRepository('FictionStoryBundle:Chapter')->getAllStoryChapters($story),
	    			'choice_label' => 'title'
	    	))
	    	->getForm();
	    	
	    	$chapterEditForm->handleRequest($request);
	    	 
	    	if ($chapterEditForm->isSubmitted() && $chapterEditForm->isValid())
	    	{
	    		$newChapter = $chapterEditForm->get('chapters')->getData();
	    		return $this->redirect($this->generateUrl('edit_chapter', array(
	    				'storyId' => $storyId, 'chapterNumber' => $newChapter->getChapterNumber())));
	    	}
	    	else 
	    	{
	    		$chapterEditForm = $chapterEditForm->createView();
	    	}
    	//}
    	//else
    	//{
    		//$chapterEditForm = null;
    	//}    	
    	
    	/**
    	 * Create a form to edit general world info (i.e. title, description, parents)
    	 */
    	$form = $this->createForm(new StoryType(), $story, array(
            'method' => 'PUT'
        ));
    	 
    	$form->handleRequest($request);
    	 
    	if ($form->isSubmitted() && $form->isValid())
    	{
    		$em = $this->getDoctrine()->getManager();
    		
    		/*foreach($originalParents as $parent)
    		{
    			if (false === $world->getParents()->contains($parent))
    			{
    				$parent->getChildren()->removeElement($world);
    				
    				$em->persist($parent);
    			}
    		}*/
    		
    		$em->persist($story);
    		
    		$em->flush();
    	}
    	 
    	return $this->render('FictionStoryBundle:Story:edit.html.twig', array(
    			'form' => $form->createView(),
    			'chapterForm' => $chapterEditForm,
                'story_id' => $storyId
    	));
    }
    
    public function viewStoryAction(Request $request, $storyId)
    {
    	$repository = $this->getDoctrine()->getRepository('FictionStoryBundle:Story');
    	$story = $repository->findOneById($storyId);
    	
    	if (!$story)
    	{
    		throw $this->createNotFoundException("This Story does not exist");
    	}
    	
    	return $this->render('FictionStoryBundle:Story:view_story.html.twig', array(
    			'story' => $story
    	));
    }
    
    /*public function userWorldsAction()
    {
    	$user = $this->get('security.token_storage')->getToken()->getUser();
    	$worlds = $user->getWorlds();
    	 
    	// parameters to template
    	return $this->render('FictionWorldBundle:World:user_worlds.html.twig', array(
    			'worlds' => $worlds
    	));
    }*/
    
    public function deleteStoryAction(Request $request, $storyId)
    {
        
        $story = $this->getDoctrine()->getRepository('FictionStoryBundle:Story')->findOneById($storyId);
        
        if ($this->get('security.authorization_checker')->isGranted('delete', $story->getWorld()) === false)
        {
            $request->getSession()->getFlashBag()->add(
				'error',
				'Oops! You don\'t have permission to delete this story. 
	    			You can view your stories in your <a href=\''.$this->generateUrl('user_worlds').'\'>profile</a>!'
			);
	    	
	    	return $this->render('FictionAppBundle::error.html.twig', array());
        } 
        
        //delete the world
        
        //Redirect to the user worlds page
        return $this->redirect($this->generateUrl('user_worlds', 302));
        
    }
    
    public function deleteConfirmStoryAction(Request $request, $storyId)
    {
        $story = $this->getDoctrine()->getRepository('FictionStoryBundle:Story')->findOneById($storyId);
        
        if ($this->get('security.authorization_checker')->isGranted('delete', $story->getWorld()) === false)
        {
            $request->getSession()->getFlashBag()->add(
				'error',
				'Oops! You don\'t have permission to delete this story. 
	    			You can view your stories in your <a href=\''.$this->generateUrl('user_worlds').'\'>profile</a>!'
			);
	    	
	    	return $this->render('FictionAppBundle::error.html.twig', array());
        } 
        
        $user = $this->get('security.token_storage')->getToken()->getUser();
        return $this->render('FictionStoryBundle:Story:delete_confirm.html.twig', array(
    			'storyId' => $storyId
    	));
    }
}
