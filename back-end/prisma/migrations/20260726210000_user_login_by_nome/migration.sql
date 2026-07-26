-- Login passa a usar nome (único). E-mail fica opcional para o perfil futuro.
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;

-- Remove índice único antigo do e-mail se existir com outro nome; recria seguro
DROP INDEX IF EXISTS "users_email_key";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- Nome único para autenticação
CREATE UNIQUE INDEX "users_nome_key" ON "users"("nome");
