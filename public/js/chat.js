import {friendClick} from './grid.js'

console.log(friendClick)



function setCookie(cookie) {
    var cookies = document.cookie;

    let cookieArray;
    cookies.includes(';') ? cookieArray = cookies.split(';') : cookieArray = cookies.split('=');


    

    if(cookie.includes('current_joined')) {
        for (let i = 0; i < cookie.length; i++) {
            
        }
    }
}

$(function() {

    var friendMessages = {
        'john': {
            activeStatus: null,
            messages: [
                {content: 'Hello', type: 'sent'},
                {content: 'Hi bro', type: 'received'}
            ]
        }
    
    }
    
    
    function newPerson(person) {
        return `
             <div class="message" data-img="/src/img/download.png" data-username="${person.username}">
                 <div class="image-div">
                     <img class="friend-avatar" src="/src/img/download.png" alt="image of friend" srcset="" />
                 </div>
                 <div class="msg-text-name">
                     <div class="friend-name">
                         <span id="username">${person.fullname ? person.fullname : person.first_name + ' ' + person.last_name}</span>
                     </div>
                     <div class="msg-content">
                         <span class="msg-span">${friendMessages[person.username] ? friendMessages[person.username].messages[friendMessages[person.username].messages.length-1].content : '@' + person.username}</span>
                     </div>
                 </div>
             </div>
         `
     }


    fetch('/messages?username=*')
        .then(res => {return res.json()})
        .then((data) =>{
            console.log('data: ', data)
            console.log('bring friendMessages: ', friendMessages)
            var obj = Object.keys(data);
            friendMessages = data;
            obj.forEach((key, i) => {
                console.log('key: ', key);
                friendMessages[key].activeStatus = null
                $('.messages-div').append(newPerson(friendMessages[key]));
            })
            friendClick();
            console.log('friendmessages from fetch: ', friendMessages)
            $('.message').click(messageClick)
        });
    friendClick();

    var socket = io();
    var chatArea = document.querySelector('.chat-area')
    var existMsg = chatArea.innerHTML

    var newMessage = (text, elclass, time) => {
        let returnMsg = `
            <div class="message-row ${elclass}">
                <div class="message-text">
                    ${text}
                </div>
                <div class="message-time">
                    <span class="time">${time}</span>
                    <span>
                        ${elclass == 'you-message' ? '<i class="fas fa-check"></i>' : ''}
                    </span>
                </div>
            </div>
        `;
        return returnMsg;
    };

    function submitCall(friend) {
        $('.submit').click(function(e) {

            e.preventDefault();

            let msg = $('#message-box').val();

            if(msg == '') return;

            socket.emit('new_message', {message: msg, toUser: friend, fullName: $('#header-username').html()});
            
            socket.on('add_new_messages', (data) => {
                console.log('add_new_messages data: ', data);
            })

            try {
                var msgInd = friendMessages[friend].messages;
                msgInd.push({content: msg, type: 'sent'})
                $('.msg-span').html(msgInd[msgInd.length-1].content)
            } catch (err) {

            }

            console.log(friendMessages);

            chatArea.innerHTML = newMessage(msg, 'you-message', null) + chatArea.innerHTML;
            $('#message-box').val('');
        })
    }



    socket.on('new_msg', function(data) {

        console.log(data.message)
  
        chatArea.innerHTML = newMessage(data.message, 'other-message', null) + chatArea.innerHTML;
        var msgInd = friendMessages[data.username].messages
        msgInd.push({content: data.message, type: 'received'})

        $('.msg-span').html(msgInd[msgInd.length-1].content)

        socket.emit('save_message', {message: data.message, username: data.username})

    })


    socket.on('add_new_messages', (data) => {
        console.log('add_new_messages data: ', data);
    })



    function messageClick(e) {
        console.log('calling message click');
        let friendUsername = this.dataset.username;
        socket.emit('join', {friend: friendUsername});
        submitCall(this.dataset.username);
        chatArea.innerHTML = '';
        console.log('data username: ', this.dataset.username);
        // friendClick();
        let span = document.querySelector('#header-username');
        span.dataset.username = this.dataset.username;

        document.cookie = `current_joined=${this.dataset.username}`

        if(friendMessages[friendUsername].activeStatus) {

                $('#lastseen').html(friendMessages[friendUsername].activeStatus);
        } else {
            console.log(this.dataset.username)
            socket.emit('bring_status', {username: this.dataset.username}, (status, fromDb) => {
                console.log('bringing status')
                console.log('status: ', status)
                if(status != 'online') {
                    let lastSeen = `last seen ${parseDate(status)}`
                    $('#lastseen').html(lastSeen);
                    try {
                        friendMessages[this.dataset.username].activeStatus = lastSeen;
                        console.log('lastSeen FriendMessages: ', friendMessages)
                    } catch(err) {
                        return;
                    }
                } else {
                    $('#lastseen').html(status) 
                }
            });
        }

        try {
            friendMessages[friendUsername].messages.forEach((msg) => {
                let elClass;
                if(msg.type == 'sent') {
                    elClass = 'you-message';
                } else {
                    elClass = 'other-message';
                }
    
                chatArea.innerHTML = newMessage(msg.content, elClass, null) + chatArea.innerHTML;
    
            })
        } catch (err) {

        }

    }
    $('.message').click(messageClick);


    socket.on('online', (friend) => {
        var t = document.cookie;
        if(friend.username === t.substring(t.indexOf('=')+1)) {
            socket.emit('join', {friend: friend.username});
        }
    })

    socket.on('connected', (data) => {
        let ls;
        try {
            ls = friendMessages[data.username].activeStatus = `${data.status}`;
        } catch (err) {
            ls = data.status
        }

        if ($('#header-username').data('username') == data.username) {
            $('#lastseen').html(ls);
        }

    })



    socket.on('disconnected', (data) => {
        try {
            let ls = friendMessages[data.username].activeStatus = `last seen ${parseDate(data.time)}`
            console.log(friendMessages);
            $('#lastseen').html(ls);
        } catch (err) {
            if($('#header-username').data('username') == data.username) {
                $('#lastseen').html(`last seen ${parseDate(data.time)}`)
            }
        }
    })


    $('.search').on('keyup', function () {
        $('.messages-div').addClass('inactive-left');
        $('.messages-div').removeClass('active-left');
        $('.search-div').addClass('active-left');
        $('.search-div').removeClass('inactive-left');

        var url = new URL(`${window.location.origin}/search`),
            params = {username: this.value.toLowerCase()}
        
        Object.keys(params).forEach(key => {
            url.searchParams.append(key, params[key])
        })
        
        fetch(url)
            .then(res => res.json())
            .then(data => {
                $('.search-div').html('');
                console.log(data);
                let goodData = data.filter((x) => {
                    return x.username != $('.container').data('user')
                })
                console.log('good data: ', goodData)
                goodData.forEach((person) => {
                    $('.search-div').append(newPerson(person))
                })

                friendClick();
                $('.message').click(messageClick);
            })
    })
})

function parseDate(d) {
    let date = new Date(d);
    let currentDate = new Date();
    let prefix = ''

    let dateArray = date.toString().split(' ');

    let dateDiff = currentDate.getDate() - date.getDate()
    if(dateDiff === 0) {
        prefix = 'today at'    
    } else if(dateDiff === 1) {
        prefix = 'yesterday at'
    } else if(dateDiff >= 1 && dateDiff < 7) {
        console.log(dateDiff)
        prefix = dateArray[0] + ' at'
    } else if (dateDiff >= 7){
        console.log('im here last week')
        prefix = dateArray[1] + ' ' + dateArray[2] + ' at';
    }

    return `${prefix} ${(toString(date.getHours()).length)<2 ? '0' : ''}${date.getHours()}:${(toString(date.getMinutes()).length)<2 ? '0' : ''}${date.getMinutes()}`;
}