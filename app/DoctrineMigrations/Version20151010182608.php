<?php

namespace Fiction\Migrations;

use Doctrine\DBAL\Migrations\AbstractMigration;
use Doctrine\DBAL\Schema\Schema;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
class Version20151010182608 extends AbstractMigration
{
    /**
     * @param Schema $schema
     */
    public function up(Schema $schema)
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->abortIf($this->connection->getDatabasePlatform()->getName() != 'mysql', 'Migration can only be executed safely on \'mysql\'.');

        $this->addSql('CREATE TABLE story (id INT AUTO_INCREMENT NOT NULL, world_id INT DEFAULT NULL, title VARCHAR(255) NOT NULL, description LONGTEXT NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, word_count INT NOT NULL, INDEX IDX_EB5604388925311C (world_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8 COLLATE utf8_unicode_ci ENGINE = InnoDB');
        $this->addSql('CREATE TABLE story_category (story_id INT NOT NULL, category_id INT NOT NULL, INDEX IDX_5A9075DAA5D4036 (story_id), INDEX IDX_5A9075D12469DE2 (category_id), PRIMARY KEY(story_id, category_id)) DEFAULT CHARACTER SET utf8 COLLATE utf8_unicode_ci ENGINE = InnoDB');
        $this->addSql('ALTER TABLE story ADD CONSTRAINT FK_EB5604388925311C FOREIGN KEY (world_id) REFERENCES world (id)');
        $this->addSql('ALTER TABLE story_category ADD CONSTRAINT FK_5A9075DAA5D4036 FOREIGN KEY (story_id) REFERENCES story (id)');
        $this->addSql('ALTER TABLE story_category ADD CONSTRAINT FK_5A9075D12469DE2 FOREIGN KEY (category_id) REFERENCES category (id)');
        $this->addSql('DROP TABLE world_category');
        $this->addSql('ALTER TABLE world DROP word_count');
        $this->addSql('ALTER TABLE parents ADD CONSTRAINT FK_FD501D6ADD62C21B FOREIGN KEY (child_id) REFERENCES world (id)');
        $this->addSql('ALTER TABLE parents ADD CONSTRAINT FK_FD501D6A727ACA70 FOREIGN KEY (parent_id) REFERENCES world (id)');
        $this->addSql('ALTER TABLE chapter CHANGE world_id story_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE chapter ADD CONSTRAINT FK_F981B52EAA5D4036 FOREIGN KEY (story_id) REFERENCES story (id)');
        $this->addSql('CREATE INDEX IDX_F981B52EAA5D4036 ON chapter (story_id)');
    }

    /**
     * @param Schema $schema
     */
    public function down(Schema $schema)
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->abortIf($this->connection->getDatabasePlatform()->getName() != 'mysql', 'Migration can only be executed safely on \'mysql\'.');

        $this->addSql('ALTER TABLE chapter DROP FOREIGN KEY FK_F981B52EAA5D4036');
        $this->addSql('ALTER TABLE story_category DROP FOREIGN KEY FK_5A9075DAA5D4036');
        $this->addSql('CREATE TABLE world_category (world_id INT NOT NULL, category_id INT NOT NULL, INDEX IDX_F3AC98B88925311C (world_id), INDEX IDX_F3AC98B812469DE2 (category_id), PRIMARY KEY(world_id, category_id)) DEFAULT CHARACTER SET utf8 COLLATE utf8_unicode_ci ENGINE = InnoDB');
        $this->addSql('ALTER TABLE world_category ADD CONSTRAINT FK_F3AC98B812469DE2 FOREIGN KEY (category_id) REFERENCES category (id)');
        $this->addSql('ALTER TABLE world_category ADD CONSTRAINT FK_F3AC98B88925311C FOREIGN KEY (world_id) REFERENCES world (id)');
        $this->addSql('DROP TABLE story');
        $this->addSql('DROP TABLE story_category');
        $this->addSql('DROP INDEX IDX_F981B52EAA5D4036 ON chapter');
        $this->addSql('ALTER TABLE chapter CHANGE story_id world_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE parents DROP FOREIGN KEY FK_FD501D6ADD62C21B');
        $this->addSql('ALTER TABLE parents DROP FOREIGN KEY FK_FD501D6A727ACA70');
        $this->addSql('ALTER TABLE world ADD word_count INT NOT NULL');
    }
}
