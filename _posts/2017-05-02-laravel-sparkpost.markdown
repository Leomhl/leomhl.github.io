---
title:  "Envio de emails com Laravel e Sparkpost"
date:   2017-04-07 12:50:00
description: Dicas para a integração
---


Olá Devs! Estou trazendo uma dica hoje sobre a integração com a Sparkpost para envio de emails em massa (ou não) via Laravel 5.4.

Se você ainda não ouviu o meu comentário sobre o Sparkpost no [OpenDev podcast](http://www.opendevpodcast.com.br/) dê um pulo lá e ouça.

Bom, vamos lá! Primeiro, crie a sua conta em https://www.sparkpost.com/ e verifique o Email. Esse procedimento é igual ao de qualquer outro site quando você inicia uma conta.

Após estar logado, acesse "Account" e vá até "API KEYS" no menu lateral. Após isso, acione o botão "add key". Então, adicione as permissões desejadas e salve. Pronto, a parte mais difícil foi feita, rs! 

Vá ao arquivo .env no seu Laravel e coloque as seguintes chaves:

{% highlight PHP %}
MAIL_DRIVER=sparkpost
MAIL_HOST=smtp.sparkpostmail.com
MAIL_PORT=587
MAIL_USERNAME=Login do seu email
MAIL_PASSWORD=Senha do seu email
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=Seu email
MAIL_FROM_NAME=Nome de envio, por exemplo: "Leonardo"
SPARKPOST_SECRET=Api key que você acabou de gerar
{% endhighlight %}


Pronto, é só isso! Basta reiniciar o servidor para que ele releia os dados do .env. Um bom teste é acionar a recuperação de senha para verificar se funcionou corretamente. Caso haja alguma dúvida, deixe um comentário. Se eu ver que tem pessoas com essa dúvida, farei um vídeo ensinando a fazer a integração completa.


Um forte abraço!