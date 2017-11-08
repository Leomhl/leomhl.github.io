---
title:  "Traduzindo o email de recuperação de senha do Laravel"
date:   2017-11-08 10:00:00
description: Melhorando a comunicação com o usuário
---

Olá caro(a) Dev, neste post mostrarei algo que pesquisei por bastante tempo e que acredito que seja um grande problema para várias pessoas. Como traduzir o email de recuperação de senha do laravel?


![Imagem da tela]({{ site.baseurl }}assets/images/posts/2017/11/2017-11-02-recoverypass-laravel-translate/recoverypass.png)


O Laravel tem um sistema de Autenticação muito prático, afinal, é só executar o comando artisan abaixo e você tem toda a autenticação pronta.


{% highlight SHELL %}
php artisan make:auth
{% endhighlight %}

Porém, o email de redifinição de senha (reset password) vem com as informações em inglês. Vamos arrumar isso!

A primeira coisa que devemos entender é que o email enviado não é um simple Mail do Laravel, o sistema de resetpassord é uma Notificação. O Laravel permite que você sobreescreva a função sendPasswordResetNotification da model User.


Vamos criar uma notificação para sobrescrever a padrão, utilize o comando:


{% highlight SHELL %}
php artisan make:notification enviaEmaildeDefinicaodeSenha
{% endhighlight %}


A classe criada estará na pasta app/Notifications do seu projeto. Altere as informações contidas nela para as que você deseja, a minha ficou assim:

{% highlight SHELL %}
<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;

class enviaEmaildeDefinicaodeSenha extends Notification
{
    use Queueable;
    public $token;

    /**
     * Create a new notification instance.
     *
     * @return void
     */
    public function __construct($token)
    {
        $this->token = $token;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @param  mixed  $notifiable
     * @return array
     */
    public function via($notifiable)
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     *
     * @param  mixed  $notifiable
     * @return \Illuminate\Notifications\Messages\MailMessage
     */
    public function toMail($notifiable)
    {

        $url = env('APP_URL').'/password/reset/'.$this->token;
        return (new MailMessage)
                ->greeting('Olá')
                ->line('Você está recebendo este e-mail porque recebemos um pedido de redefinição de senha para sua conta.')
                ->action('Redefinir senha', url(config('app.url').route('password.reset', $this->token, false)))
                ->line('Se você não solicitou uma redefinição de senha, ignore este email.');
    }

    /**
     * Get the array representation of the notification.
     *
     * @param  mixed  $notifiable
     * @return array
     */
    public function toArray($notifiable)
    {
        return [
            //
        ];
    }
}
{% endhighlight %}


O model User deverá ficar assim:

{% highlight SHELL %}
<?php

namespace App;

use Illuminate\Notifications\Notifiable;
use Illuminate\Foundation\Auth\User as Authenticatable;
use App\Notifications\enviaEmaildeDefinicaodeSenha;

class User extends Authenticatable
{
    use Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'name', 'email', 'password',
    ];

    /**
     * The attributes that should be hidden for arrays.
     *
     * @var array
     */
    protected $hidden = [
        'password', 'remember_token',
    ];

    public function sendPasswordResetNotification($token)
    {
      $this->notify(new enviaEmaildeDefinicaodeSenha($token));
    }
}

{% endhighlight %}


Publique a sua notificação para o Laravel reconhecê-la daqui em diante.

{% highlight SHELL %}
php artisan vendor:publish --tag=laravel-notifications
{% endhighlight %}


Caso também queira personalizar o layout do email, substitua "MailMessage" na classe enviaEmaildeDefinicaodeSenha por uma classe Mail criada por você!



Até breve ;)