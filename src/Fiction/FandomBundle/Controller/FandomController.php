<?php

namespace Fiction\FandomBundle\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\Request;
use Fiction\FandomBundle\Entity\Fandom;
use Fiction\FandomBundle\Entity\Chapter;
use Fiction\FandomBundle\Form\Type\FandomType;
use Fiction\FandomBundle\Form\Type\FandomFilterType;
use Doctrine\Common\Collections\ArrayCollection;

class FandomController extends Controller
{
    public function createFandomAction(Request $request)
    {
    	$fandom = new Fandom();
    	$fandom->setTitle('Fandom Title...');
    	$fandom->setDescription('A mindblowing Fandom summary or description...');
    	$fandom->setUser($this->get('security.context')->getToken()->getUser());
    	
    	$form = $this->createForm(new FandomType(), $fandom);
    	
    	$form->handleRequest($request);
    	
    	if ($form->isValid())
    	{
    		$em = $this->getDoctrine()->getManager();
    		$em->persist($fandom);
    		$em->flush();
    	}
    	
        return $this->render('FictionFandomBundle:Fandom:create.html.twig', array(
        	'form' => $form->createView()
        ));
    }
    
    public function findFandomsAction(Request $request, $page = 1)
    {
    	
    	$repository = $this->getDoctrine()->getRepository('FictionFandomBundle:Fandom');
    	
    	$form = $this->createForm(new FandomFilterType());
    	
    	$form->handleRequest($request);
    	if ($form->isValid()) {
    		$data = $form->getData();
    		
    		$page = 1;
    		
    		$fandoms = $repository->getFilteredFandoms($data, 2, $page);
    		
    		$totalFandoms = $repository->getTotalFilteredFandoms($data);
    		
    	}
    	else
    	{
    		$fandoms = $repository->findFandoms(2, $page);
    		
    		$totalFandoms = $repository->getTotalFandoms();
    	}
    	
    	$paginator = new \lib\Paginator($page, $totalFandoms, 2);
    	$pageList = $paginator->getPageList();
    	
    	// parameters to template
    	return $this->render('FictionFandomBundle:Fandom:find_fandoms.html.twig', array(
    		'fandoms' => $fandoms, 'paginator' => $pageList, 'page' => $page,
    		'form' => $form->createView()
    	));
    }
    
    public function viewFandomChildrenAction(Request $request, $fandomId, $page)
    {
    	$repository = $this->getDoctrine()->getRepository('FictionFandomBundle:Fandom');
    	$fandoms = $repository->findChildFandoms($fandomId, 2, $page);
    
    	if (!$fandoms)
    	{
    		$flash = $this->get('braincrafted_bootstrap.flash');
	    	
	    	$flash->error('This Fandom doesn\'t have any Fandoms that extend it.');
    	}
    	
    	$totalChildren = $repository->getTotalChildFandoms($fandomId);
    	
    	$paginator = new \lib\Paginator($page, $totalChildren, 2);
    	$pageList = $paginator->getPageList();
    
    	return $this->render('FictionFandomBundle:Fandom:view_fandom_children.html.twig', array(
    			'fandoms' => $fandoms, 'paginator' => $pageList, 'page' => $page, 'fandomId' => $fandomId
    	));
    }
    
    public function editFandomAction(Request $request, $fandomId)
    {
    	$repository = $this->getDoctrine()->getRepository('FictionFandomBundle:Fandom');
    	$fandom = $repository->findUserFandom($fandomId, $this->get('security.context')->getToken()->getUser());
    	 
    	if (!$fandom)
    	{
    		throw $this->createNotFoundException("You don't own this Fandom!");
    	}
    	
    	$originalParents = new ArrayCollection();
    	
    	foreach ($fandom->getParents() as $parent) {
    		$originalParents->add($parent);
    	}
    	
    	if ($fandom->getFandomType()->getId() === 1)
    	{
	    	/**
	    	 * Create a form so the user can edit an individual chapter
	    	 */
	    	$chapterEditForm = $this->createFormBuilder()
	    	->setMethod('GET')
	    	->add('chapters', 'entity', array(
	    			'class' => 'FictionFandomBundle:Chapter',
	    			'choices' => $this->getDoctrine()->getRepository('FictionFandomBundle:Chapter')->getAllFandomChapters($fandom),
	    			'property' => 'title'
	    	))
	    	->getForm();
	    	
	    	$chapterEditForm->handleRequest($request);
	    	 
	    	if ($chapterEditForm->isValid())
	    	{
	    		$newChapter = $chapterEditForm->get('chapters')->getData();
	    		return $this->redirect($this->generateUrl('edit_chapter', array(
	    				'fandomId' => $fandomId, 'chapterNumber' => $newChapter->getChapterNumber())));
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
    	 * Create a form to edit general fandom info (i.e. title, description, parents)
    	 */
    	$form = $this->createForm(new FandomType(), $fandom);
    	 
    	$form->handleRequest($request);
    	 
    	if ($form->isValid())
    	{
    		$em = $this->getDoctrine()->getManager();
    		
    		foreach($originalParents as $parent)
    		{
    			if (false === $fandom->getParents()->contains($parent))
    			{
    				$parent->getChildren()->removeElement($fandom);
    				
    				$em->persist($parent);
    			}
    		}
    		
    		$em->persist($fandom);
    		
    		$em->flush();
    	}
    	 
    	return $this->render('FictionFandomBundle:Fandom:edit.html.twig', array(
    			'form' => $form->createView(),
    			'chapterForm' => $chapterEditForm
    	));
    }
    
    public function viewFandomAction(Request $request, $fandomId)
    {
    	$repository = $this->getDoctrine()->getRepository('FictionFandomBundle:Fandom');
    	$fandom = $repository->findOneById($fandomId);
    	
    	if (!$fandom)
    	{
    		throw $this->createNotFoundException("This Fandom does not exist");
    	}
    	
    	return $this->render('FictionFandomBundle:Fandom:view_fandom.html.twig', array(
    			'fandom' => $fandom
    	));
    }
    
    public function userFandomsAction()
    {
    	$user = $this->get('security.context')->getToken()->getUser();
    	$fandoms = $user->getFandoms();
    	 
    	// parameters to template
    	return $this->render('FictionFandomBundle:Fandom:user_fandoms.html.twig', array(
    			'fandoms' => $fandoms
    	));
    }
}
