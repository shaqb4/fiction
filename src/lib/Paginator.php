<?php

namespace lib;

class Paginator
{
	private $totalPages;
	
	private $page;
	
	private $perPage;
	
	public function __construct($page, $totalCount, $perPage)
	{
		$this->perPage = $perPage;
		$this->page = $page;
		
		$this->setTotalPages($totalCount, $this->perPage);
	}
	
	private function setTotalPages($totalCount, $perPage)
	{
		if ($perPage == 0)
		{
			$perPage = 20;
		}
		
		$this->totalPages = ceil($totalCount / $perPage);
		
		return $this->totalPages;
	}
	
	public function getTotalPages()
	{
		return $this->totalPages;
	}
	
	public function getPageList()
	{
		$pagination = array('label' => array(), 'page' => array());
		if ($this->totalPages >= 5)
		{
			$pageCount = 5;
		}
		else 
		{
			$pageCount = $this->totalPages;
		}
		
		$i = 1;
		
		if ($this->page + floor($pageCount/2) > $this->totalPages)
		{
			$i = $this->totalPages - $pageCount + 1;
		}
		else if ($this->page > ceil($pageCount/2)) 
		{
			$i = $this->page - floor($pageCount/2);
		}
		
		$max = $i + $pageCount;		
		
		if ($i > 1)
		{
			$pagination['label'][] = '<<';
			$pagination['page'][] = 1;
		}
		if ($this->page > 1)
		{
			$pagination['label'][] = '<';
			$pagination['page'][] = $this->page - 1;
		}
		
		for (; $i < $max; $i++)
		{
			$pagination['label'][] = $i;
			$pagination['page'][] = $i;
		}
		
		if ($this->page < $this->totalPages)
		{
			$pagination['label'][] = '>';
			$pagination['page'][] = $this->page + 1;
		}
		
		if ($max < $this->totalPages)
		{
			$pagination['label'][] = '>>';
			$pagination['page'][] = $this->totalPages;
		}
		
		return $pagination;
	}
}