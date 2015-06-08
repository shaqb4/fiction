<?php
namespace Fiction\MarkdownEditorBundle\Form\Type;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\Form\FormInterface;
use Symfony\Component\Form\FormView;
use Symfony\Component\OptionsResolver\OptionsResolver;

class MarkdownType extends AbstractType
{
    /**
     * {@inheritdoc}
     */
    public function buildView(FormView $view, FormInterface $form, array $options)
    {
        $view->vars = array_replace($view->vars, array(
            'show_help' => $options['show_help']
        ));
    }
    /**
     * {@inheritdoc}
     */
    public function configureOptions(OptionsResolver $resolver)
    {
        $resolver->setDefaults(array(
            'attr'              => array(
                'class'         => 'content-editor',
                'data-provide'  => 'markdown',
                'rows'          => 15,
            ),
            'show_help' => false
        ));
    }
    public function getParent()
    {
        return 'textarea';
    }
    public function getName()
    {
        return 'markdown';
    }
}