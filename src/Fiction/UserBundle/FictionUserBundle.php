<?php

namespace Fiction\UserBundle;

use Symfony\Component\HttpKernel\Bundle\Bundle;

class FictionUserBundle extends Bundle
{
	public function getParent()
	{
		return 'FOSUserBundle';
	}
}
