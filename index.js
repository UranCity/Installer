const mv = require("mv"),
	fs = require("fs"),
	path = require("path"),
	chalk = require("chalk"),
	request = require("request"),
	bar = require("cli-progress"),
	unzipper = require("unzipper"),
	profile = require("./profile.json"),
	Downloader = require("nodejs-file-downloader");

//* Title Screen
console.log(
	chalk.cyan(`\n\
       █████  █████                              █████████  ███  █████             \n\
      ░░███  ░░███                              ███░░░░░███░░░  ░░███              \n\
       ░███   ░███ ████████  ██████  ████████  ███     ░░░ ████ ███████  █████ ████\n\
       ░███   ░███░░███░░███░░░░░███░░███░░███░███        ░░███░░░███░  ░░███ ░███ \n\
       ░███   ░███ ░███ ░░░  ███████ ░███ ░███░███         ░███  ░███    ░███ ░███ \n\
       ░███   ░███ ░███     ███░░███ ░███ ░███░░███     ███░███  ░███ ███░███ ░███ \n\
       ░░████████  █████   ░░████████████ █████░░█████████ █████ ░░█████ ░░███████ \n\
        ░░░░░░░░  ░░░░░     ░░░░░░░░░░░░ ░░░░░  ░░░░░░░░░ ░░░░░   ░░░░░   ░░░░░███ \n\
                                                                          ███ ░███ \n\
                                                                         ░░██████  \n\
                                                                          ░░░░░░   \n\
\n`) + ` Développé par ${chalk.hex("#5271FF")("ValentinKhmer")}\n`
);

(async function () {
	console.log(" Préparation de l'installation...");

	const downloadPath = path.join(process.env.USERPROFILE, "/downloads"),
		urancityPath = path.join(process.env.APPDATA, ".uranciy"),
		urancityTempPath = path.join(process.env.APPDATA, ".uranciy-save"),


	//* Check if last version
	const lastVersion = request(
		{
			method: "GET",
			url: "https://raw.githubusercontent.com/UranCity/Client/main/VERSION"
		},
		function (error, response) {
			if (error)
				throw new Error(error);
			return response.body;
		}
	);
	const currentVersion = fs.readFileSync(path.join(urancityPath, "VERSION"));

	if (lastVersion !== currentVersion) return console.log(" Vous possédez déjà la dernière version du client !");


	//* Define the list of files/folders to save
	const toSave = [
		// Folders
		"resourcepacks",
		"saves",
		"schematics",
		"screenshots",
		"shaderpacks",
		"XaeroWaypoints",

		// Files
		"options.txt",
		"optionsof.txt",
		"usercache.json",
		"usernamecache.json",
	],


	//* Add a interlude between steps
	wait = (ms) =>
		new Promise((resolve) => setTimeout(resolve, ms ? ms : 1000));

	const cliBar = new bar.SingleBar({
		format: " Progression |" + chalk.blue("{bar}") + "| {percentage}%",
		stopOnComplete: true,
		clearOnComplete: false,
		cloneFiles: false,
		barCompleteChar: "\u2588",
		barIncompleteChar: "\u2591",
		hideCursor: true,
	});


	console.log(" Téléchargement des fichiers...");
	cliBar.start(100, 0);

	//* Download client zip file
	let fileName = "";
	const download = new Downloader({
		url: "https://github.com/UranCity/Client/archive/refs/heads/main.zip",
		directory: downloadPath,
		onProgress: function (percentage) {
			cliBar.update(percentage);
		},
		cloneFiles: false,
		maxAttempts: 3,
		onError: function (err) {
			error(err);
		},
		onBeforeSave: (deducedName) => {
			fileName = deducedName;
		},
	});

	try {
		console.log(
			chalk.red(
				`\n⚠ NE TOUCHEZ PAS AU FICHIER "${path.join(downloadPath, fileName)}" !`
			)
		);
		await download.download();
		cliBar.update(100);
	} catch (err) {
		error(err);
	};
	await wait();

	if (fs.existsSync(urancityPath)) {
		console.log("\n Sauvegarde des fichiers personnels...");

		cliBar.start(100, 0);
		try {
			fs.mkdir(urancityTempPath);

			for (let e = 0; e < toSave.length; e++) {
				mv(
					path.join(urancityPath, toSave[e]),
					path.join(urancityTempPath, toSave[e]),
					{ mkdirp: true },
					function (err) {
						return error(err);
					}
				);
				cliBar.update(Math.round((e / toSave.length) * 100));
			};
			fs.rmdir(urancityPath);
			cliBar.update(100);

			wait();
		} catch (err) {
			return error(err);
		}
	}

	console.log("\n Extraction des fichiers...");
	cliBar.start(100, 0);
	fs.createReadStream(path.join(downloadPath, fileName)).pipe(
		unzipper.Extract({
			path: urancityPath,
		})
	);
	cliBar.update(100);

	await wait();

	console.log("\n Renommage du dossier principal...");
	cliBar.start(100, 0);
	try {
		fs.renameSync(
			path.join(process.env.APPDATA, fileName.split(".")[0]),
			urancityPath
		);
	} catch (err) {
		error(err);
	};

	cliBar.update(100);
	await wait();

	if (fs.existsSync(urancityTempPath)) {
		console.log("\n Importation de la sauvegarde...");

		cliBar.start(100, 0);
		try {
			for (let a = 0; a < toSave.length; a++) {
				mv(
					path.join(urancityTempPath, toSave[a]),
					path.join(urancityPath, toSave[a]),
					{ mkdirp: true },
					function (err) {
						return error(err);
					}
				);
				cliBar.update(Math.round((a / toSave.length) * 100));
			}
			fs.rmdir(urancityTempPath);
			cliBar.update(100);
		} catch (err) {
			error(err);
		};
	};

	console.log("\n Installation du profile...");

	cliBar.start(100, 0);
	try {
		let existJson = false;
		const jsonFilesPath = [
			path.join(process.env.APPDATA, ".minecraft", "launcher_profiles.json"), // Launcher Mojang (old)
			path.join(
				process.env.APPDATA,
				".minecraft",
				"launcher_profiles_microsoft_store.json"
			), // Launcher Microsoft (new)
		];

		for (let y; y < jsonFilesPath.length; y++) {
			if (fs.existsSync(jsonFilesPath[y])) {
				const readder = fs.readFileSync(jsonFilesPath[y]);

				const jsonObj = JSON.parse(readder);

				Object.defineProperty(jsonObj.profiles, "urancity", {
					value: JSON.parse(profile),
				});

				fs.writeFileSync(jsonFilesPath[y], JSON.stringify(jsonObj));
				existJson = true;
			}
			cliBar.update((y / jsonFilesPath) * 100);
		}

		if (!existJson) error("Aucun launcher reconnu...");
		cliBar.update(100);
	} catch (err) {
		error(err);
	};

	setTimeout(function () {
		console.log(" ");
		process.exit();
	}, 10000);
})();

function error(err) {
	console.error(` \n ` + err);
	process.exit();
};
