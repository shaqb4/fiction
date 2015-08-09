<?php

namespace Fiction\WorldBundle\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\Request;
use Fiction\WorldBundle\Entity\World;
use Fiction\WorldBundle\Entity\Chapter;
use Fiction\WorldBundle\Form\Type\ChapterType;

class ChapterController extends Controller
{	
    public function createChapterAction(Request $request, $worldId)
    {
    	$user = $this->get('security.token_storage')->getToken()->getUser();
    	
    	$chapter = new Chapter();
    	$chapter->setTitle('Chapter Title...');
    	$chapter->setContent('Once upon a time...');
		
		$repository = $this->getDoctrine()->getRepository('FictionWorldBundle:World');
        $world = $repository->findOneById($worldId);
        
        if ($this->get('security.authorization_checker')->isGranted('edit', $world) === false)
        {
            $request->getSession()->getFlashBag()->add(
				'error',
				'Oops! You don\'t have permission to edit this world. 
	    			You can view your stories in your <a href=\''.$this->generateUrl('user_worlds').'\'>profile</a>!'
			);
	    	
	    	return $this->render('FictionAppBundle::error.html.twig', array());
        } 
	    else
	    {
	    	$chapter->setWorld($world);
    	
	    	$form = $this->createForm(new ChapterType($world, sizeof($world->getChapters()), true), $chapter, array(
                'method' => 'POST'
            ));
	    	
	    	$form->handleRequest($request);
	    	
	    	if ($form->isSubmitted() && $form->isValid())
	    	{
	    		$em = $this->getDoctrine()->getManager();
	    		$em->persist($chapter);
				
				
				$totalWorldWords = $world->getWordCount() + str_word_count($chapter->getContent(), 0, '0123456789');
				$world->setWordCount($totalWorldWords);
				$em->persist($world);
				
				$chapter->setWordCount(str_word_count($chapter->getContent(), 0, '0123456789'));
				$em->persist($chapter);
	    		
				$em->flush();
				
				return $this->redirect($this->generateUrl('edit_chapter', array(
    					'worldId' => $worldId, 
    					'chapterNumber' => $chapter->getChapterNumber()))
    			);
	    	}
	    	
	        return $this->render('FictionWorldBundle:Chapter:create.html.twig', array(
	        	'form' => $form->createView(),
	        	'world' => $world->getTitle()
	        ));
	    }  
    }
    
    public function editChapterAction(Request $request, $worldId, $chapterNumber)
    {
    	$user = $this->get('security.token_storage')->getToken()->getUser();
    	 
    	$repository = $this->getDoctrine()->getRepository('FictionWorldBundle:World');
        $world = $repository->findOneById($worldId);
        
        if ($this->get('security.authorization_checker')->isGranted('edit', $world) === false)
        {
            $request->getSession()->getFlashBag()->add(
				'error',
				'Oops! You don\'t have permission to edit this world. 
	    			You can view your stories in your <a href=\''.$this->generateUrl('user_worlds').'\'>profile</a>!'
			);
	    	
	    	return $this->render('FictionAppBundle::error.html.twig', array());
        } 
    	else
    	{
    		$chapter = $this->getDoctrine()->getRepository('FictionWorldBundle:Chapter')
    		->findOneBy(array('world' => $world, 'chapter_number' => $chapterNumber));
    		 
    		if (!$chapter) 
			{
				$request->getSession()->getFlashBag()->add(
					'error',
					'Oops! This chapter doesn\'t exist. 
	    				You can edit your world and its chapters <a href=\''.$this->generateUrl('edit_world', array('worldId' => $worldId)).'\'>
						here</a>!'
				);
	    	
	    		return $this->render('FictionAppBundle::error.html.twig', array());
    		}
    		
    		$form = $this->createForm(new ChapterType($world, $chapterNumber), $chapter, array(
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
    			
    			$updatedChapters = $this->getDoctrine()->getRepository('FictionWorldBundle:Chapter')
    			->getUpdatedWorldChapters($world, $startChapter, $endChapter);
    			
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
    			
				//Get the world word count, then add the edited chapters new word count and subtract its original word count				
				$totalWorldWords = $world->getWordCount() + str_word_count($chapter->getContent(), 0, '0123456789') - $chapter->getWordCount();
				$world->setWordCount($totalWorldWords);
				$em->persist($world);
				
				$chapter->setWordCount(str_word_count($chapter->getContent(), 0, '0123456789'));
				$em->persist($chapter);
    			
				$em->flush();
    			
    			return $this->redirect($this->generateUrl('edit_chapter', array(
    					'worldId' => $worldId, 
    					'chapterNumber' => $chapter->getChapterNumber()))
    			);
    		}
    
    		return $this->render('FictionWorldBundle:Chapter:edit.html.twig', array(
    				'form' => $form->createView(),
    				'world' => $world->getTitle(),
    				'worldId' => $worldId,
    				'chapter' => $chapter->getTitle(),
    		));
    	}
    }
    
    public function viewChapterAction(Request $request, $worldId, $chapterNumber)
    {
    	$world = $this->getDoctrine()->getRepository('FictionWorldBundle:World')->findOneById($worldId);
    	
    	$chapter = $this->getDoctrine()->getRepository('FictionWorldBundle:Chapter')
    				->getWorldChapter($world, $chapterNumber);
    	    	
    	$form = $this->createFormBuilder()
    		->setMethod('GET')
    		->add('chapters', 'entity', array(
    			'class' => 'FictionWorldBundle:Chapter',
    			'choices' => $this->getDoctrine()->getRepository('FictionWorldBundle:Chapter')->getAllWorldChapters($world),
    			'choice_label' => 'title',
    			'data' => $chapter
    		))
    		->getForm();
    		
    	$form->handleRequest($request);
    	
    	if ($form->isSubmitted() && $form->isValid())
    	{
    		$newChapter = $form->get('chapters')->getData();
    		return $this->redirect($this->generateUrl('view_chapter', array(
    				'worldId' => $worldId, 'chapterNumber' => $newChapter->getChapterNumber())));
    	}
    	
    	if (is_null($chapter))
    	{
    		return $this->redirect($this->generateUrl('view_world', array('worldId' => $worldId)));
    	}
		else 
		{
			return $this->render('FictionWorldBundle:Chapter:view.html.twig', array(
					'chapter' => $chapter, 'form' => $form->createView(), 'world' => $world
			));
		}   
    }
}
