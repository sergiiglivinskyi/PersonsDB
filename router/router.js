const low = require('lowdb');


const usersdb = low();
const marksdb = low();
const groupsdb = low();


module.exports = function(app) {

	app.get('/', checkAuth, (req,res) => {
		res.redirect('/app');
	});

	app.get('/login', (req, res) => {
		if (typeof req.session.user == 'undefined'){
        	res.render('login', {title: 'myApp', 'message': 'Login', 'errMsg': ''});
		} else {
			res.redirect('/app');
		}
	});

	app.get('/register', (req, res) => {
        res.render('register', {title: 'Register', 'message': 'Register', 'errMsg': ''});
	});

	var authUserList = {
		admin: {
			name: 'Admincheg',
			pwd: '12345',
			role: 'admin',
			id: 1
		},
		editor:{
			name: 'Editorcheg',
			pwd: '12345',
			role: 'editor',
			id: 2
		}
	};

	app.post('/login', (req, res) => {

		if (authUserList.hasOwnProperty(req.body.login) && (authUserList[req.body.login]['pwd'] == req.body.pwd)) {
			if (req.body.rememberMe == 'on') {
				var oneMin = 60000;
				req.session.cookie.expires = new Date(Date.now() + oneMin*10);
    			req.session.cookie.maxAge = oneMin*10;
			} else {
				req.session.cookie.expires = false; // enable the cookie to remain for only the duration of the user-agent
			}
			req.session.user = {
				id:   authUserList[req.body.login].id,
				name: authUserList[req.body.login].name,
				role: authUserList[req.body.login].role
			};
			res.redirect('/app');
		} else {
			var userLoginDb = usersdb.get('users').find({ login: req.body.login, active: true }).value();
			if ((userLoginDb != null)&&(userLoginDb.pwd == req.body.pwd)) {
				req.session.cookie.expires = false;
				req.session.user = {
					id:   userLoginDb.id,
					name: userLoginDb.name,
					role: userLoginDb.role
				};
				res.redirect('/app');
			} else {
				res.render('login', {title: 'Login', message: 'Login', errMsg: 'login or pwd is not valid(active)'});
			}
		}
	});

	app.post('/register', (req, res) => {
		var regLogin = usersdb.get('users').find({ login: req.body.login }).value();
		if (regLogin != null) {
			res.render('register', {title: 'Register', message: 'Register', errMsg: 'login exists'});
		} else {
			usersdb.get('users').push({
				id: Date.now(),
				name: req.body.name,
				secondname: req.body.secondname,
				age: null,
				gender: null,
				groupid: null,
				login: req.body.login,
				pwd: req.body.pwd,
				role: "user",
				created: Date.now(),
				active: false
			}).last().write();
			res.redirect('/login');
		}
	});

	app.get('/app', checkAuth, function(req, res) {
		var users = usersdb.get('users').value();
		var groups = groupsdb.get('groups').value();
		res.render('app', {userDetails: req.session.user, users: users, groups: groups});
	});

	app.get('/jsondata', function(req, res) {
		var data = usersdb.get('users').cloneDeep().value();
		res.header('Access-Control-Allow-Origin', '*');
		// console.log (data.length);
		data.forEach(function(obj){
			delete obj.pwd; //remove pwd key
		});
		res.send(JSON.stringify(data));
	});

	app.post('/add', checkAuth, (req, res) => {
		// console.log("add: " + req.body.name);
		const allowedUsers = ['admin', 'viewer'];
		if (allowedUsers.indexOf(req.session.user.role) != -1) {
			const record = usersdb.get('users').push({
				id: Date.now(),
				name: req.body.name,
				secondname: req.body.secondname,
				age: req.body.age,
				gender: req.body.gender,
				groupid: parseInt(req.body.groupid),
				login: req.body.login,
				pwd: req.body.pwd,
				role: req.body.roles,
				created: Date.now(),
				active: true
			}).last().write();
			if (record == 'undefined') {
				res.status(400).json({
					err: {status: 400, data: err, message: "failed to add"}
				});
			} else {
				res.status(200).json(record);
			}
		}
	});

 	app.get('/logout', function(req, res) {
		if (req.session.user) {
			// res.clearCookie('rememberme');
			delete req.session.user;
		}
		res.redirect('/login');
	});

	app.delete('/delete/:id', checkAuth, function (req, res) {
		// console.log(req.params.id);
		const allowedUsers = ['admin'];
		if (allowedUsers.indexOf(req.session.user.role) != -1) {
			// console.log ("delete is allowed");
			const id = parseInt(req.params.id);
			var result = usersdb.get('users').remove({ id }).write();
			if (result == 'undefined') {
				res.status(400).json({
					err: {status: 400, data: err, message: "failed to delete..."}
				});
			} else {
				res.status(200).json(result);
			}
		}
		// res.redirect('/app');
	});

	app.put('/update/:id', checkAuth, function (req, res) {
		// console.log(req.params.id);
		// console.log(req.body._id);
		const id = parseInt(req.params.id);
		var record = usersdb.get('users').find({ id: id }).value();
		// console.log(record);
		if (record == 'undefined') {
			res.status(400).json({
				err: {status: 400, data: err, message: "failed to update..."}
			});
		} else {
			res.status(200).json(record);
			// res.send(obj);
		}
	});

	function checkAuth(req, res, next) {
		if (typeof req.session.user == 'undefined') {
			res.redirect('/login');
		} else {
			next();
		}
	}

	 app.get('/marks/group/:id', function(req, res) {
	 	const id = parseInt(req.params.id);
		// var group = groupsdb.get('groups').find({ id: id }).value();
		var users = usersdb.get('users').filter({groupid: id}).value();
		var marks = marksdb.get('marks').value();
		if (users == 'undefined') {
			res.status(400).json({
				err: {status: 400, data: err, message: "no users in group"}
			});
		} else {
			var output = [];
			users.forEach(function(user){
				marks.forEach(function(mark){
					if (user.id == mark.userid) {
						output.push({
							id: mark.id,
							name: user.name,
							secondname: user.secondname,
							group: "no group",
							hw1: mark.hw1.mark,
							hw2: mark.hw2.mark,
							cw: mark.cw.mark
						});
					}
				});
			});
			res.status(200).json(output);
		}
	});

}
