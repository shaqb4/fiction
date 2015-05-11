<?php

namespace Fiction\FandomBundle\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\Request;
use Fiction\FandomBundle\Entity\Fandom;
use Fiction\FandomBundle\Entity\Chapter;
use Fiction\FandomBundle\Form\Type\ChapterType;

class ChapterController extends Controller
{	
    public function createChapterAction(Request $request, $fandomId)
    {
    	$user = $this->get('security.context')->getToken()->getUser();
    	
    	$chapter = new Chapter();
    	$chapter->setTitle('Chapter Title...');
    	$chapter->setContent('Once upon a time...');
    	
	    $fandom = $this->getDoctrine()
	        ->getRepository('FictionFandomBundle:Fandom')
	        ->findUserFandom($fandomId, $user);
	    
	    if (!$fandom) {
	        /*throw $this->createNotFoundException(
	            'You do not have a story with id: '.$fandomId
	        );*/
	    	$flash = $this->get('braincrafted_bootstrap.flash');
	    	
	    	$flash->error('Oops! You don\'t have a fandom with an id of <strong>'. $fandomId.'</strong>. 
	    			You can see which fandoms are yours in your <a href=\''.$this->generateUrl('user_fandoms').'\'>profile</a>!');
	    	
	    	return $this->render('FictionFandomBundle:Chapter:create.html.twig', array(
	    			'form' => '',
	    			'fandom' => ''
	    	));
	    }
	    else
	    {
	    	$chapter->setFandom($fandom);
    	
	    	$form = $this->createForm(new ChapterType(), $chapter);
	    	
	    	$form->handleRequest($request);
	    	
	    	if ($form->isValid())
	    	{
	    		$em = $this->getDoctrine()->getManager();
	    		$em->persist($chapter);
	    		$em->flush();
	    	}
	    	
	        return $this->render('FictionFandomBundle:Chapter:create.html.twig', array(
	        	'form' => $form->createView(),
	        	'fandom' => $fandom->getTitle()
	        ));
	    }  
    }
    
    public function editChapterAction(Request $request, $fandomId, $chapterNumber)
    {
    	$user = $this->get('security.context')->getToken()->getUser();
    	 
    	$fandom = $this->getDoctrine()
    	->getRepository('FictionFandomBundle:Fandom')
    	->findUserFandom($fandomId, $user);
    	 
    	if (!$fandom) {
    		$flash = $this->get('braincrafted_bootstrap.flash');
    
    		$flash->error('Oops! You don\'t have a fandom with an id of <strong>'. $fandomId.'</strong>.
	    			You can see which fandoms are yours in your <a href=\''.$this->generateUrl('user_fandoms').'\'>profile</a>!');
    
    		return $this->render('FictionFandomBundle:Chapter:edit.html.twig', array(
    				'form' => '',
    				'fandom' => '',
    				'chapter' => ''
    		));
    	}
    	else
    	{
    		$chapter = $this->getDoctrine()->getRepository('FictionFandomBundle:Chapter')
    		->findOneBy(array('fandom' => $fandom, 'chapter_number' => $chapterNumber));
    		 
    		if (!$chapter) {
    			$flash = $this->get('braincrafted_bootstrap.flash');
    		
    			$flash->error('Oops! This fandom doesn\'t have a chapter number <strong>'. $chapterNumber .'</strong>.
	    			You can see your fandoms\' information in your <a href=\''.$this->generateUrl('user_fandoms').'\'>profile</a>!');
    		
    			return $this->render('FictionFandomBundle:Chapter:edit.html.twig', array(
    					'form' => '',
    					'fandom' => $fandom->getTitle(),
    					'chapter' => ''
    			));
    		}
    		
    		$form = $this->createForm(new ChapterType($fandom, $chapterNumber), $chapter);
    
    		$form->handleRequest($request);
    		
    		if ($form->isValid())
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
    			
    			$updatedChapters = $this->getDoctrine()->getRepository('FictionFandomBundle:Chapter')
    			->getUpdatedFandomChapters($fandom, $startChapter, $endChapter);
    			
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
    			
    			$em->persist($chapter);
    			$em->flush();
    			
    			return $this->redirect($this->generateUrl('edit_chapter', array(
    					'fandomId' => $fandomId, 
    					'chapterNumber' => $chapter->getChapterNumber()))
    			);
    		}
    
    		return $this->render('FictionFandomBundle:Chapter:edit.html.twig', array(
    				'form' => $form->createView(),
    				'fandom' => $fandom->getTitle(),
    				'fandomId' => $fandomId,
    				'chapter' => $chapter->getTitle(),
    		));
    	}
    }
    
    public function viewChapterAction(Request $request, $fandomId, $chapterNumber)
    {
    	$fandom = $this->getDoctrine()->getRepository('FictionFandomBundle:Fandom')->findOneById($fandomId);
    	
    	$chapter = $this->getDoctrine()->getRepository('FictionFandomBundle:Chapter')
    				->getFandomChapter($fandom, $chapterNumber);
    	    	
    	$form = $this->createFormBuilder()
    		->setMethod('GET')
    		->add('chapters', 'entity', array(
    			'class' => 'FictionFandomBundle:Chapter',
    			'choices' => $this->getDoctrine()->getRepository('FictionFandomBundle:Chapter')->getAllFandomChapters($fandom),
    			'property' => 'title',
    			'data' => $chapter
    		))
    		->getForm();
    		
    	$form->handleRequest($request);
    	
    	if ($form->isValid())
    	{
    		$newChapter = $form->get('chapters')->getData();
    		return $this->redirect($this->generateUrl('view_chapter', array(
    				'fandomId' => $fandomId, 'chapterNumber' => $newChapter->getChapterNumber())));
    	}
    	
    	if (is_null($chapter))
    	{
    		return $this->redirect($this->generateUrl('view_fandom', array('fandomId' => $fandomId)));
    	}
		else 
		{
			return $this->render('FictionFandomBundle:Chapter:view.html.twig', array(
					'chapter' => $chapter, 'form' => $form->createView(), 'fandom' => $fandom
			));
		}   
    }
}
