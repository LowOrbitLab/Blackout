window.blackoutHasStarted = false

var blackoutFallbackErrors = []

function blackoutFallbackErrorHandler (e) {
	blackoutFallbackErrors.push(e.error)
}

window.addEventListener('error', blackoutFallbackErrorHandler, false)

setTimeout(function () {
	if (!window.blackoutHasStarted) {
		var alertConfirmed = confirm(
			"It looks like Blackout is not able to load. " +
			"If this is shown by mistake, please report it to the Blackout project and click 'Cancel' to continue.\n" +
			"If the app did indeed not load, please click 'Ok' to display the error report."
		)
		if (alertConfirmed == true) {
			var text = '';
			// Title
			text += '<h1>Blackout Error Report</h1>'

			// Add info about browser
			text += '<p>UserAgent: ' + navigator.userAgent + '<br />Language: ' + navigator.language + '</p>'

			if (blackoutFallbackErrors.length > 0) {
				text += '<h3>Errors</h3>'

				for (var idx = 0; idx < blackoutFallbackErrors.length; idx++) {
					var error = blackoutFallbackErrors[idx]
					if (error) {
						text += '<p>' + error.message + '<br />' + error.stack + '</p>'
					}
				}
			}
			text += '<h3>Project information: https://github.com/LowOrbitLab/Blackout<br />Do not share recovery phrases or private keys.</h3>'

			// Overwrite the whole content of the page with our text
			window.document.write(text)
		}
	} else {
		console.debug('App has started, removing error listener')
		window.removeEventListener('error', blackoutFallbackErrorHandler)
		blackoutFallbackErrors = []
	}
}, 10000)
