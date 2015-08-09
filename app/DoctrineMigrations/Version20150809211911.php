<?php

namespace Fiction\Migrations;

use Doctrine\DBAL\Migrations\AbstractMigration;
use Doctrine\DBAL\Schema\Schema;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
class Version20150809211911 extends AbstractMigration
{
    /**
     * @param Schema $schema
     */
    public function up(Schema $schema)
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->abortIf($this->connection->getDatabasePlatform()->getName() != 'mysql', 'Migration can only be executed safely on \'mysql\'.');

        $this->addSql('ALTER TABLE chapter ADD CONSTRAINT FK_F981B52E8925311C FOREIGN KEY (world_id) REFERENCES world (id)');
        $this->addSql('CREATE INDEX IDX_F981B52E8925311C ON chapter (world_id)');
        $this->addSql('ALTER TABLE parents ADD CONSTRAINT FK_FD501D6ADD62C21B FOREIGN KEY (child_id) REFERENCES world (id)');
        $this->addSql('ALTER TABLE parents ADD CONSTRAINT FK_FD501D6A727ACA70 FOREIGN KEY (parent_id) REFERENCES world (id)');
    }

    /**
     * @param Schema $schema
     */
    public function down(Schema $schema)
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->abortIf($this->connection->getDatabasePlatform()->getName() != 'mysql', 'Migration can only be executed safely on \'mysql\'.');

        $this->addSql('ALTER TABLE chapter DROP FOREIGN KEY FK_F981B52E8925311C');
        $this->addSql('DROP INDEX IDX_F981B52E8925311C ON chapter');
        $this->addSql('ALTER TABLE parents DROP FOREIGN KEY FK_FD501D6ADD62C21B');
        $this->addSql('ALTER TABLE parents DROP FOREIGN KEY FK_FD501D6A727ACA70');
    }
}
