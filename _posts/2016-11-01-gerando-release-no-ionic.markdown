---
title:  "Gerando o release mais fácil da sua vida com Ionic"
date:   2016-11-01 15:40:00
description: Dica que mudou a minha forma de trabalhar 
---

Olá seres habitantes de uma caverna (também conhecida como escritório) que consomem café e têm sensibilidade à luz. Hoje vou dar uma dica de como automatizar a assinatura de aplicativos gerados no Ionic framework para entrar na versão de deploy na Google Play. É uma dica bastante simples mas que eu "bati cabeça" por muito tempo para descobrir.

Primeiro, gere a sua chave de autenticação .keystore. Caso você não saiba gerar, [isso aqui](https://elvisrodrigues.wordpress.com/2012/03/14/gerar-chave-privada-e-assinar-app-android-de-forma-rapida-e-pratica/) pode te ajudar.

Na verdade, é bem fácil. Vamos lá! 
Após instalar a plataforma Android no projeto com o comando:

{% highlight shell %}
ionic platform add android
{% endhighlight %}

Você deve entrar na pasta platforms/android e criar um arquivo chamado:

{% highlight Plain Text %}
release-signing.properties
{% endhighlight %}

Dentro deste arquivo deve conter o seguinte conteúdo:

{% highlight Plain Text %}
storeFile = nomeDaSuaKey.keystore
keyAlias = aliasDaSuaKey

storePassword= storePasswordDaSuaKey
keyPassword= keyPasswordDaSuaKey
{% endhighlight %}


**Importante:** o arquivo nomeDaSuaKey.keystore também deve ficar na pasta android junto ao release-signing.properties. 

Feito isso, basta executar no terminal o comando: 

{% highlight shell %}
ionic build android --release
{% endhighlight %}

E... como num passe de mágica ele irá gerar e te fornecer o diretório do build no terminal com o aplicativo em modo debug, release e release assinado. O nosso cara para enviar para a google play é o assigned-release.apk.

Pronto, é só isso! No more! Fica a dica, até a próxima.