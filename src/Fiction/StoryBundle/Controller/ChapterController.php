<?php

namespace Fiction\StoryBundle\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\Request;
use Fiction\StoryBundle\Entity\Story;
use Fiction\StoryBundle\Entity\Chapter;
use Fiction\StoryBundle\Form\Type\ChapterType;

class ChapterController extends Controller
{	
    public function createChapterAction(Request $request, $storyId)
    {
    	$user = $this->get('security.token_storage')->getToken()->getUser();
    	
    	$chapter = new Chapter();
    	$chapter->setTitle('Chapter Title...');
    	$chapter->setContent('Once upon a time...');
		
		$repository = $this->getDoctrine()->getRepository('FictionStoryBundle:Story');
        $story = $repository->findOneById($storyId);
        
        if ($this->get('security.authorization_checker')->isGranted('edit', $story) === false)
        {
            $request->getSession()->getFlashBag()->add(
				'error',
				'Oops! You don\'t have permission to edit this story. 
	    			You can view your stories in your <a href=\''.$this->generateUrl('user_worlds').'\'>profile</a>!'
			);
	    	
	    	return $this->render('FictionAppBundle::error.html.twig', array());
        } 
	    else
	    {
	    	$chapter->setStory($story);
    	
	    	$form = $this->createForm(new ChapterType($story, sizeof($story->getChapters()), true), $chapter, array(
                'method' => 'POST'
            ));
	    	
	    	$form->handleRequest($request);
	    	
	    	if ($form->isSubmitted() && $form->isValid())
	    	{
	    		$em = $this->getDoctrine()->getManager();
	    		$em->persist($chapter);
				
				
				$totalStoryWords = $story->getWordCount() + str_word_count($chapter->getContent(), 0, '0123456789');
				$story->setWordCount($totalStoryWords);
				$em->persist($story);
				
				$chapter->setWordCount(str_word_count($chapter->getContent(), 0, '0123456789'));
				$em->persist($chapter);
	    		
				$em->flush();
				
				return $this->redirect($this->generateUrl('edit_chapter', array(
    					'storyId' => $storyId, 
    					'chapterNumber' => $chapter->getChapterNumber()))
    			);
	    	}
	    	
	        return $this->render('FictionStoryBundle:Chapter:create.html.twig', array(
	        	'form' => $form->createView(),
	        	'story' => $story->getTitle()
	        ));
	    }  
    }
    
    public function editChapterAction(Request $request, $storyId, $chapterNumber)
    {
    	$user = $this->get('security.token_storage')->getToken()->getUser();
    	 
    	$repository = $this->getDoctrine()->getRepository('FictionStoryBundle:Story');
        $story = $repository->findOneById($storyId);
        
        if ($this->get('security.authorization_checker')->isGranted('edit', $story) === false)
        {
            $request->getSession()->getFlashBag()->add(
				'error',
				'Oops! You don\'t have permission to edit this story. 
	    			You can view your stories in your <a href=\''.$this->generateUrl('user_worlds').'\'>profile</a>!'
			);
	    	
	    	return $this->render('FictionAppBundle::error.html.twig', array());
        } 
    	else
    	{
    		$chapter = $this->getDoctrine()->getRepository('FictionStoryBundle:Chapter')
    		->findOneBy(array('story' => $story, 'chapter_number' => $chapterNumber));
    		 
    		if (!$chapter) 
			{
				$request->getSession()->getFlashBag()->add(
					'error',
					'Oops! This chapter doesn\'t exist. 
	    				You can edit your story and its chapters <a href=\''.$this->generateUrl('edit_world', array('worldId' => $worldId)).'\'>
						here</a>!'
				);
	    	
	    		return $this->render('FictionAppBundle::error.html.twig', array());
    		}
    		
    		$form = $this->createForm(new ChapterType($story, $chapterNumber), $chapter, array(
                'method' => 'PUT'
            ));
    
    		$form->handleRequest($request);
    		
    		if ($form->isSubmitted() && $form->isValid())
    		{
    			if ($chapterNumber <= $chapter->getChapterNumber())
    			{
    				$startChapter = $chapterNumber;
    				$endChapter = $form->get('chapter_number')->getData();
    			}
    			else
    			{
    				$endChapter = $chapterNumber;
    				$startChapter = $chapter->getChapterNumber();
    			}
    			
    			$updatedChapters = $this->getDoctrine()->getRepository('FictionStoryBundle:Chapter')
    			->getUpdatedStoryChapters($story, $startChapter, $endChapter);
    			
    			$em = $this->getDoctrine()->getManager();
    			
    			/**
    			 * Turn this into a service!!!
    			 */
    			for ($i = 0; $i < sizeof($updatedChapters); $i++)
    			{
    				$c = $updatedChapters[$i];
    				
					if ($c->getId() !== $chapter->getId())
					{
						if ($chapterNumber < $chapter->getChapterNumber())
						{
							$c->setChapterNumber($c->getChapterNumber()-1);
						}
						else if ($chapterNumber > $chapter->getChapterNumber())
						{
							$c->setChapterNumber($c->getChapterNumber()+1);
						}
					}
	    				
    				$em->persist($c);
    			}
    			
				//Get the story word count, then add the edited chapters new word count and subtract its original word count				
				$totalStoryWords = $story->getWordCount() + str_word_count($chapter->getContent(), 0, '0123456789') - $chapter->getWordCount();
				$story->setWordCount($totalStoryWords);
				$em->persist($story);
				
				$chapter->setWordCount(str_word_count($chapter->getContent(), 0, '0123456789'));
				$em->persist($chapter);
    			
				$em->flush();
    			
    			return $this->redirect($this->generateUrl('edit_chapter', array(
    					'storyId' => $storyId, 
    					'chapterNumber' => $chapter->getChapterNumber()))
    			);
    		}
    
    		return $this->render('FictionStoryBundle:Chapter:edit.html.twig', array(
    				'form' => $form->createView(),
    				'story' => $story->getTitle(),
    				'storyId' => $storyId,
    				'chapter' => $chapter->getTitle(),
    		));
    	}
    }
    
    public function viewChapterAction(Request $request, $storyId, $chapterNumber)
    {
    	$story = $this->getDoctrine()->getRepository('FictionStoryBundle:Story')->findOneById($storyId);
    	
    	$chapter = $this->getDoctrine()->getRepository('FictionStoryBundle:Chapter')
    				->getStoryChapter($story, $chapterNumber);
    	    	
    	$form = $this->createFormBuilder()
    		->setMethod('GET')
    		->add('chapters', 'entity', array(
    			'class' => 'FictionStoryBundle:Chapter',
    			'choices' => $this->getDoctrine()->getRepository('FictionStoryBundle:Chapter')->getAllStoryChapters($story),
    			'choice_label' => 'title',
    			'data' => $chapter
    		))
    		->getForm();
    		
    	$form->handleRequest($request);
    	
    	if ($form->isSubmitted() && $form->isValid())
    	{
    		$newChapter = $form->get('chapters')->getData();
    		return $this->redirect($this->generateUrl('view_chapter', array(
    				'storyId' => $storyId, 'chapterNumber' => $newChapter->getChapterNumber())));
    	}
    	
    	if (is_null($chapter))
    	{
    		return $this->redirect($this->generateUrl('view_story', array('storyId' => $storyId)));
    	}
		else 
		{
			return $this->render('FictionStoryBundle:Chapter:view.html.twig', array(
					'chapter' => $chapter, 'form' => $form->createView(), 'story' => $story
			));
		}   
    }
}
