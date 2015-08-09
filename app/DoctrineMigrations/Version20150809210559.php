<?php

namespace Fiction\Migrations;

use Doctrine\DBAL\Migrations\AbstractMigration;
use Doctrine\DBAL\Schema\Schema;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
class Version20150809210559 extends AbstractMigration
{
    /**
     * @param Schema $schema
     */
    public function up(Schema $schema)
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->abortIf($this->connection->getDatabasePlatform()->getName() != 'mysql', 'Migration can only be executed safely on \'mysql\'.');

        $this->addSql('ALTER TABLE chapter DROP FOREIGN KEY FK_F981B52ED6F3E531');
        $this->addSql('ALTER TABLE fandom_category DROP FOREIGN KEY FK_5034D801D6F3E531');
        $this->addSql('ALTER TABLE parents DROP FOREIGN KEY FK_FD501D6A727ACA70');
        $this->addSql('ALTER TABLE parents DROP FOREIGN KEY FK_FD501D6ADD62C21B');
        $this->addSql('CREATE TABLE world (id INT AUTO_INCREMENT NOT NULL, user_id INT DEFAULT NULL, world_type_id INT DEFAULT NULL, title VARCHAR(255) NOT NULL, description LONGTEXT NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, word_count INT NOT NULL, INDEX IDX_3A771143A76ED395 (user_id), INDEX IDX_3A7711432A09A2C4 (world_type_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8 COLLATE utf8_unicode_ci ENGINE = InnoDB');
        $this->addSql('CREATE TABLE world_category (world_id INT NOT NULL, category_id INT NOT NULL, INDEX IDX_F3AC98B88925311C (world_id), INDEX IDX_F3AC98B812469DE2 (category_id), PRIMARY KEY(world_id, category_id)) DEFAULT CHARACTER SET utf8 COLLATE utf8_unicode_ci ENGINE = InnoDB');
        $this->addSql('ALTER TABLE world ADD CONSTRAINT FK_3A771143A76ED395 FOREIGN KEY (user_id) REFERENCES fos_user (id)');
        $this->addSql('ALTER TABLE world ADD CONSTRAINT FK_3A7711432A09A2C4 FOREIGN KEY (world_type_id) REFERENCES type (id)');
        $this->addSql('ALTER TABLE world_category ADD CONSTRAINT FK_F3AC98B88925311C FOREIGN KEY (world_id) REFERENCES world (id)');
        $this->addSql('ALTER TABLE world_category ADD CONSTRAINT FK_F3AC98B812469DE2 FOREIGN KEY (category_id) REFERENCES category (id)');
        $this->addSql('DROP TABLE fandom');
        $this->addSql('DROP TABLE fandom_category');
        $this->addSql('DROP INDEX IDX_F981B52ED6F3E531 ON chapter');
        $this->addSql('ALTER TABLE chapter CHANGE fandom_id world_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE chapter ADD CONSTRAINT FK_F981B52E8925311C FOREIGN KEY (world_id) REFERENCES world (id)');
        $this->addSql('CREATE INDEX IDX_F981B52E8925311C ON chapter (world_id)');
        $this->addSql('ALTER TABLE parents DROP FOREIGN KEY FK_FD501D6A727ACA70');
        $this->addSql('ALTER TABLE parents DROP FOREIGN KEY FK_FD501D6ADD62C21B');
        $this->addSql('ALTER TABLE parents ADD CONSTRAINT FK_FD501D6A727ACA70 FOREIGN KEY (parent_id) REFERENCES world (id)');
        $this->addSql('ALTER TABLE parents ADD CONSTRAINT FK_FD501D6ADD62C21B FOREIGN KEY (child_id) REFERENCES world (id)');
    }

    /**
     * @param Schema $schema
     */
    public function down(Schema $schema)
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->abortIf($this->connection->getDatabasePlatform()->getName() != 'mysql', 'Migration can only be executed safely on \'mysql\'.');

        $this->addSql('ALTER TABLE chapter DROP FOREIGN KEY FK_F981B52E8925311C');
        $this->addSql('ALTER TABLE parents DROP FOREIGN KEY FK_FD501D6ADD62C21B');
        $this->addSql('ALTER TABLE parents DROP FOREIGN KEY FK_FD501D6A727ACA70');
        $this->addSql('ALTER TABLE world_category DROP FOREIGN KEY FK_F3AC98B88925311C');
        $this->addSql('CREATE TABLE fandom (id INT AUTO_INCREMENT NOT NULL, user_id INT DEFAULT NULL, fandom_type_id INT DEFAULT NULL, title VARCHAR(255) NOT NULL COLLATE utf8_unicode_ci, description LONGTEXT NOT NULL COLLATE utf8_unicode_ci, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, word_count INT NOT NULL, INDEX IDX_8E7C9A58A76ED395 (user_id), INDEX IDX_8E7C9A58E496FA6 (fandom_type_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8 COLLATE utf8_unicode_ci ENGINE = InnoDB');
        $this->addSql('CREATE TABLE fandom_category (fandom_id INT NOT NULL, category_id INT NOT NULL, INDEX IDX_5034D801D6F3E531 (fandom_id), INDEX IDX_5034D80112469DE2 (category_id), PRIMARY KEY(fandom_id, category_id)) DEFAULT CHARACTER SET utf8 COLLATE utf8_unicode_ci ENGINE = InnoDB');
        $this->addSql('ALTER TABLE fandom ADD CONSTRAINT FK_8E7C9A58A76ED395 FOREIGN KEY (user_id) REFERENCES fos_user (id)');
        $this->addSql('ALTER TABLE fandom ADD CONSTRAINT FK_8E7C9A58E496FA6 FOREIGN KEY (fandom_type_id) REFERENCES type (id)');
        $this->addSql('ALTER TABLE fandom_category ADD CONSTRAINT FK_5034D80112469DE2 FOREIGN KEY (category_id) REFERENCES category (id)');
        $this->addSql('ALTER TABLE fandom_category ADD CONSTRAINT FK_5034D801D6F3E531 FOREIGN KEY (fandom_id) REFERENCES fandom (id)');
        $this->addSql('DROP TABLE world');
        $this->addSql('DROP TABLE world_category');
        $this->addSql('DROP INDEX IDX_F981B52E8925311C ON chapter');
        $this->addSql('ALTER TABLE chapter CHANGE world_id fandom_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE chapter ADD CONSTRAINT FK_F981B52ED6F3E531 FOREIGN KEY (fandom_id) REFERENCES fandom (id)');
        $this->addSql('CREATE INDEX IDX_F981B52ED6F3E531 ON chapter (fandom_id)');
        $this->addSql('ALTER TABLE parents DROP FOREIGN KEY FK_FD501D6ADD62C21B');
        $this->addSql('ALTER TABLE parents DROP FOREIGN KEY FK_FD501D6A727ACA70');
        $this->addSql('ALTER TABLE parents ADD CONSTRAINT FK_FD501D6ADD62C21B FOREIGN KEY (child_id) REFERENCES fandom (id)');
        $this->addSql('ALTER TABLE parents ADD CONSTRAINT FK_FD501D6A727ACA70 FOREIGN KEY (parent_id) REFERENCES fandom (id)');
    }
}
