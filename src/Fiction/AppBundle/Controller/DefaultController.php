<?php

namespace Fiction\AppBundle\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\Request;

class DefaultController extends Controller
{
    public function indexAction()
    {
        return $this->render('FictionAppBundle::home.html.twig');
    }
    
    public function errorAction()
    {
        return $this->render('FictionAppBundle::error.html.twig');
    }
    
    public function removeTrailingSlashAction(Request $request)
    {
    	$pathInfo = $request->getPathInfo();
    	$requestUri = $request->getRequestUri();
    
    	$url = str_replace($pathInfo, rtrim($pathInfo, ' /'), $requestUri);
    
    	return $this->redirect($url, 301);
    }
}
