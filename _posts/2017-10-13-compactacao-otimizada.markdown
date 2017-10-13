---
title:  "Melhor compactação no Linux"
date:   2017-10-13 10:00:00
description: Como economizar mais espaço em servidor
---

Olá, hoje trarei uma dica de qual compactação usar economizar espaço no nosso querido e tão caro servidor. Muitos utilizam zip, mas, venho te contar que zip não resolve muito os problemas... Olha só a tabela abaixo:


![Tabela de compactação]({{ site.baseurl }}assets/images/posts/2017/10/2017-10-13-compactacao-otimizada/tabela.png)


Após estudar por algum tempo, vi que a melhor opção era uzar o tar.xz. Então vamos lá! Para comprimir usando ele rode o comando:


{% highlight SHELL %}
tar -Jcf arquivo.tar.xz arquivo
{% endhighlight %}


e para descomprimir:

{% highlight SHELL %}
tar -Jxf arquivo.tar.xz
{% endhighlight %}


Até breve ;)