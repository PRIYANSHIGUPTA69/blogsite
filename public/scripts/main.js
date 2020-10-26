const likeButtonHandler =(Blog_id) => {
    var req = new XMLHttpRequest();
    req.open('GET',`/blogs/${Blog_id}/like`,true);
    req.send();
    req.onreadystatechange = function(){
        if(req.readyState==4 && req.status==200){
            var appData = JSON.parse(req.responseText);
            var likeDisplayRegion = document.querySelector('.likeDisplayRegion');
            var heartIcon = document.querySelector('.heart-icon');
            likeDisplayRegion.innerHTML = appData.likesCount;
            if(appData.isLiked){
                heartIcon.style.color = "red";
            }
            else{
                heartIcon.style.color = "black";
            }
        }
    }
}

// window.location.assign("https://www.w3schools.com")