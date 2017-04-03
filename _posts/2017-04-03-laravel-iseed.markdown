---
title:  "Laravel iseed"
date:   2017-04-03 12:08:00
description: Crie Seeds com o banco de dados
---

Um salve caro(a) developer que se esconde na caverna do seu quarto com o computador e wifi! Hoje eu lhes apresento um recurso muito útil, o [iseed](https://github.com/orangehill/iseed). Com ele você pode fazer o caminho inverso que normalmente faria com os seeds. 

O fluxo normal do laravel é: criar os seeds e popular o banco com eles. O iseed proporciona o inverso, usar as tabelas do banco para gerar seeds. Mas, qual é a utilidade disso? Imagine que você achou um SQL na net com todos os estados, cidades e bairros do país... Você vai popular o seu banco de dados com ele, mas, e quando for subir a sua aplicação Laravel para o deploy? Vai rodar migrates, seeds e ter que lembrar do SQL da net? Imagine que você ainda precise de outros 10 SQLs... No meu ver é caótico e fácil de esquecer algum. 

É aí que o iseed entra, você popula o banco e transforma as tabelas em seeds =). Let's go!

Para "instalá-lo" no seu projeto, abra o composer.json e coloque o seguinte require:

A versão 2.3 funcionou comigo sem problemas no Laravel 5.4
{% highlight json %}
"require": {
    "orangehill/iseed": "2.3"
}
{% endhighlight %}


Atualize o composer para ele instalar a nova dependência
{% highlight shell %}
composer update
{% endhighlight %}

Adicione o service provider no arquivo app/config/app.php no array providers:

{% highlight TEXT %}
Orangehill\Iseed\IseedServiceProvider::class
{% endhighlight %}


## **Alguns comandos:**

Você pode ver a lista de comandos pelo:

{% highlight shell %}
php artisan iseed -h
{% endhighlight %}

Dois comandos bastante úteis para mim são:

{% highlight shell %}
php artisan iseed minha_tabela,outra_tabela
{% endhighlight %}

{% highlight shell %}
php artisan iseed minha_tabela --database=mysql2
{% endhighlight %}

O primeiro comando cria o seed de duas tabelas, você pode fazer de uma apenas ou de várias. 

O segundo comando diz para o iseed que a tabela informada está em um banco de dados secundário (caso tenha mais de um no projeto).

Caso tenha alguma dúvida comente abaixo que terei o maior prazer em responder :smile: 

Até a próxima!