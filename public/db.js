//  Toggle sidebar on mobile
document.getElementById('menuToggle').addEventListener('click', function () {
    document.getElementById('sidebar').classList.toggle('active');
});

// Handle menu item clicks
const menuItems = document.querySelectorAll('.sidebar-menu li, .donate-btn');

menuItems.forEach(item => {
    item.addEventListener('click', function (event) {
        const pageId = this.getAttribute('data-page');
        if (!pageId) return; //  Prevents issue with buttons

        document.querySelectorAll('.page-content').forEach(page => page.classList.remove('active'));
        document.getElementById(pageId).classList.add('active');
        document.getElementById('pageTitle').textContent = pageId.charAt(0).toUpperCase() + pageId.slice(1);

        document.querySelectorAll('.sidebar-menu li').forEach(li => li.classList.remove('active'));
        if (this.tagName === 'LI') this.classList.add('active');
    });
});


// Close sidebar when clicking outside on mobile
document.addEventListener('click', function (event) {
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menuToggle');

    if (window.innerWidth <= 768 &&
        !sidebar.contains(event.target) &&
        event.target !== menuToggle &&
        !menuToggle.contains(event.target)) {
        sidebar.classList.remove('active');
    }
});


let accessToken = null;
function getAccessTokenFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("token");
}

accessToken = getAccessTokenFromURL();

async function fetchProtectedData() {
    if (!accessToken) {
        await refreshAccessToken();
    }

    if (!accessToken) {
        // Redirect to login page again
        window.location.href = '/login.html';
        return;
    }
    try {
        const response = await fetch('http://localhost:3500/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (response.status === 403) {
            accessToken = null;
            return fetchProtectedData();
        }

        
        const data = await response.json();
        if (response.ok) {
            if (confirm("Accessed!")) {
                updateContent(data.id);
            }
        }
        else {
            console.log("Access denied:", data.message);
            alert(data.message);
        }
    } catch(err) {
        console.log(err.message);
    }
}

async function refreshAccessToken() {
    try {
        const response = await fetch('http://localhost:3500/refresh', {
            method: 'POST',
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            accessToken = data.accessToken;
        } else {    
            // redirect to login page
            alert("Session expired. Redirecting to login...");
            window.location.href = '/login.html';
        }
    } catch(err) {
        console.log(err.message);
    }
}

function logout() {
    fetch('http://localhost:3500/logout', {
        method: "POST",
        credentials: 'include'
    }).then(() => {
        accessToken = null;
        alert("Logout successfully");
        window.location.href = '/login.html';
    })
}

async function updateContent(id) {
    try {
        const response = await fetch('http://localhost:3500/retrieveData', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error("Failed to fetch user data");
        }

        const data = await response.json();

        let div = document.getElementById("content");
        let h4_tags = div.getElementsByTagName('h4');
        let p_tags = div.getElementsByTagName('p');

        p_tags[0].innerText = `Email: ${data.email}`;
        p_tags[1].innerText = `Member since: ${data.createdAt}`;

        let newNode = document.createElement('p');
        newNode.innerText = `Role: ${data.role}`;
        div.insertBefore(newNode, p_tags[1]);

        newNode = document.createElement('h5');
        if (data.role === 'user') {
            h4_tags[0].innerText = `Username: ${data.username}`;
            newNode.innerText = `Age: ${data.age}`;
        } else if (data.role === 'corporation') {
            h4_tags[0].innerText = `Corporation Name: ${data.name}`;
            newNode.innerText = `Corporation Type: ${data.corporationType}`;
        } else if (data.role === 'ngo') {
            h4_tags[0].innerText = `NGO Name: ${data.name}`;
            newNode.innerText = `Details: ${data.details}`;
        }
        div.insertBefore(newNode, p_tags[0]);

    } catch (error) {
        console.error("Error fetching user data:", error.message);
        alert("Error loading profile data.");
    }
}
