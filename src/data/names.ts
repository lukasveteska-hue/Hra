// Mená pre generátor hráčov podľa národnosti

export interface NamePool {
  first: string[];
  last: string[];
}

export const NAMES: Record<string, NamePool> = {
  CZ: {
    first: ['Jan', 'Jakub', 'Tomáš', 'Lukáš', 'Matěj', 'Ondřej', 'Adam', 'Filip', 'David', 'Martin', 'Petr', 'Vojtěch', 'Michal', 'Daniel', 'Pavel', 'Šimon', 'Marek', 'Dominik', 'Václav', 'Jiří', 'Josef', 'Roman', 'Antonín', 'Stanislav', 'Radim', 'Aleš', 'Vít', 'Kryštof', 'Matyáš', 'Patrik'],
    last: ['Novák', 'Svoboda', 'Novotný', 'Dvořák', 'Černý', 'Procházka', 'Kučera', 'Veselý', 'Horák', 'Němec', 'Pokorný', 'Marek', 'Pospíšil', 'Hájek', 'Jelínek', 'Král', 'Růžička', 'Beneš', 'Fiala', 'Sedláček', 'Doležal', 'Zeman', 'Kolář', 'Navrátil', 'Čermák', 'Vaněk', 'Urban', 'Blažek', 'Kříž', 'Kovář', 'Bartoš', 'Vlček', 'Polák', 'Musil', 'Kopecký', 'Šimek', 'Konečný', 'Malý', 'Holub', 'Staněk'],
  },
  SK: {
    first: ['Martin', 'Peter', 'Tomáš', 'Lukáš', 'Matej', 'Jakub', 'Michal', 'Marek', 'Filip', 'Samuel', 'Adam', 'Patrik', 'Dominik', 'Juraj', 'Ján', 'Erik', 'Dávid', 'Richard', 'Roman', 'Miroslav', 'Matúš', 'Šimon', 'Andrej', 'Branislav', 'Kristián', 'Denis', 'Róbert', 'Ľubomír', 'Lukáš', 'Oliver'],
    last: ['Horváth', 'Kováč', 'Varga', 'Tóth', 'Nagy', 'Baláž', 'Szabó', 'Molnár', 'Lukáč', 'Kollár', 'Novák', 'Polák', 'Hudák', 'Kráľ', 'Gajdoš', 'Oravec', 'Šimko', 'Mikuláš', 'Bartko', 'Hrubý', 'Jurčík', 'Kuruc', 'Ondrejka', 'Sloboda', 'Švec', 'Bielik', 'Ďuriš', 'Hamšík', 'Lobotka', 'Mrva', 'Pekár', 'Straka', 'Urban', 'Vlček', 'Zajac', 'Benko', 'Fábry', 'Holub', 'Kopec', 'Rusnák'],
  },
  PL: {
    first: ['Jakub', 'Kacper', 'Mateusz', 'Bartosz', 'Michał', 'Piotr', 'Kamil', 'Paweł', 'Szymon', 'Krzysztof', 'Łukasz', 'Dawid', 'Tomasz', 'Adrian', 'Patryk'],
    last: ['Nowak', 'Kowalski', 'Wiśniewski', 'Wójcik', 'Kowalczyk', 'Kamiński', 'Lewandowski', 'Zieliński', 'Szymański', 'Woźniak', 'Dąbrowski', 'Kozłowski', 'Jankowski', 'Mazur', 'Krawczyk', 'Piotrowski', 'Grabowski'],
  },
  HU: {
    first: ['Bence', 'Máté', 'Levente', 'Dániel', 'Ádám', 'Balázs', 'Péter', 'Gergő', 'Dominik', 'Zsolt', 'Attila', 'Roland', 'Krisztián', 'Milán'],
    last: ['Nagy', 'Kovács', 'Tóth', 'Szabó', 'Horváth', 'Varga', 'Kiss', 'Molnár', 'Németh', 'Farkas', 'Balogh', 'Papp', 'Lakatos', 'Takács', 'Juhász'],
  },
  HR: {
    first: ['Luka', 'Ivan', 'Marko', 'Josip', 'Ante', 'Mario', 'Petar', 'Filip', 'Domagoj', 'Nikola', 'Matej', 'Karlo', 'Dino', 'Toni'],
    last: ['Horvat', 'Kovačević', 'Babić', 'Marić', 'Jurić', 'Novak', 'Knežević', 'Vuković', 'Perić', 'Matić', 'Pavlović', 'Božić', 'Blažević', 'Grgić', 'Radić'],
  },
  RS: {
    first: ['Nikola', 'Stefan', 'Marko', 'Luka', 'Aleksandar', 'Miloš', 'Nemanja', 'Filip', 'Dušan', 'Lazar', 'Uroš', 'Vuk', 'Strahinja'],
    last: ['Jovanović', 'Petrović', 'Nikolić', 'Marković', 'Đorđević', 'Stojanović', 'Ilić', 'Stanković', 'Pavlović', 'Milošević', 'Popović', 'Živković', 'Todorović'],
  },
  UA: {
    first: ['Oleksandr', 'Andriy', 'Dmytro', 'Maksym', 'Serhiy', 'Vladyslav', 'Artem', 'Bohdan', 'Mykola', 'Yaroslav', 'Denys', 'Ivan'],
    last: ['Shevchenko', 'Kovalenko', 'Bondarenko', 'Tkachenko', 'Kravchenko', 'Oliynyk', 'Shevchuk', 'Polishchuk', 'Lysenko', 'Moroz', 'Melnyk', 'Boyko'],
  },
  AT: {
    first: ['Lukas', 'David', 'Florian', 'Maximilian', 'Tobias', 'Fabian', 'Stefan', 'Julian', 'Philipp', 'Christoph', 'Moritz', 'Raphael'],
    last: ['Gruber', 'Huber', 'Bauer', 'Wagner', 'Müller', 'Pichler', 'Steiner', 'Moser', 'Mayer', 'Hofer', 'Leitner', 'Berger', 'Fuchs', 'Eder'],
  },
  DE: {
    first: ['Lukas', 'Leon', 'Jonas', 'Niklas', 'Felix', 'Paul', 'Tim', 'Jan', 'Moritz', 'Florian', 'Kevin', 'Marvin', 'Julian', 'Tom'],
    last: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann', 'Koch', 'Richter', 'Klein', 'Wolf', 'Neumann'],
  },
  EN: {
    first: ['Jack', 'Harry', 'James', 'Oliver', 'George', 'Charlie', 'Thomas', 'Joe', 'Ben', 'Sam', 'Lewis', 'Callum', 'Mason', 'Kieran'],
    last: ['Smith', 'Jones', 'Taylor', 'Brown', 'Williams', 'Wilson', 'Johnson', 'Davies', 'Robinson', 'Wright', 'Thompson', 'Evans', 'Walker', 'White', 'Hughes'],
  },
  ES: {
    first: ['Pablo', 'Álvaro', 'Sergio', 'Javier', 'Daniel', 'Adrián', 'Carlos', 'Iván', 'Marcos', 'Rubén', 'Hugo', 'Diego', 'Raúl', 'Iker'],
    last: ['García', 'Fernández', 'González', 'Rodríguez', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Martín', 'Jiménez', 'Ruiz', 'Hernández', 'Díaz', 'Moreno'],
  },
  IT: {
    first: ['Lorenzo', 'Matteo', 'Andrea', 'Francesco', 'Alessandro', 'Davide', 'Federico', 'Riccardo', 'Marco', 'Gabriele', 'Luca', 'Simone', 'Nicolò'],
    last: ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'Costa', 'Mancini'],
  },
  FR: {
    first: ['Lucas', 'Hugo', 'Théo', 'Nathan', 'Maxime', 'Antoine', 'Thomas', 'Clément', 'Louis', 'Enzo', 'Kylian', 'Mathis', 'Yanis'],
    last: ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia'],
  },
  PT: {
    first: ['João', 'Rodrigo', 'Diogo', 'Tiago', 'Rafael', 'Gonçalo', 'Pedro', 'Bruno', 'André', 'Francisco', 'Nuno', 'Rúben'],
    last: ['Silva', 'Santos', 'Ferreira', 'Pereira', 'Oliveira', 'Costa', 'Rodrigues', 'Martins', 'Sousa', 'Fernandes', 'Gonçalves', 'Gomes', 'Lopes'],
  },
  NL: {
    first: ['Daan', 'Sem', 'Lucas', 'Milan', 'Thijs', 'Jesse', 'Bram', 'Lars', 'Ruben', 'Stijn', 'Joey', 'Kees'],
    last: ['de Jong', 'Jansen', 'de Vries', 'van den Berg', 'van Dijk', 'Bakker', 'Visser', 'Smit', 'Meijer', 'de Boer', 'Mulder', 'Bos', 'Vos'],
  },
  BE: {
    first: ['Arthur', 'Louis', 'Jules', 'Lucas', 'Noah', 'Wout', 'Thibaut', 'Kevin', 'Romain', 'Senne', 'Arne'],
    last: ['Peeters', 'Janssens', 'Maes', 'Jacobs', 'Mertens', 'Willems', 'Claes', 'Goossens', 'Wouters', 'Dubois', 'Lambert'],
  },
  TR: {
    first: ['Emre', 'Mert', 'Burak', 'Yusuf', 'Kerem', 'Arda', 'Can', 'Oğuz', 'Barış', 'Ozan', 'Cengiz'],
    last: ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Aydın', 'Öztürk', 'Arslan', 'Doğan', 'Kılıç'],
  },
  SC: {
    first: ['Callum', 'Ryan', 'Lewis', 'Scott', 'Kyle', 'Jamie', 'Ross', 'Craig', 'Liam', 'Fraser'],
    last: ['Smith', 'Brown', 'Wilson', 'Campbell', 'Stewart', 'Robertson', 'Thomson', 'Anderson', 'MacDonald', 'Murray', 'McLean'],
  },
  GR: {
    first: ['Giorgos', 'Dimitris', 'Nikos', 'Kostas', 'Giannis', 'Christos', 'Vasilis', 'Panagiotis', 'Thanasis'],
    last: ['Papadopoulos', 'Georgiou', 'Nikolaou', 'Ioannou', 'Dimitriou', 'Pappas', 'Konstantinou', 'Vlachos', 'Makris'],
  },
  DK: {
    first: ['Mads', 'Mikkel', 'Rasmus', 'Jonas', 'Frederik', 'Oliver', 'Mathias', 'Emil', 'Andreas', 'Kasper'],
    last: ['Nielsen', 'Jensen', 'Hansen', 'Pedersen', 'Andersen', 'Christensen', 'Larsen', 'Sørensen', 'Rasmussen', 'Poulsen'],
  },
  NO: {
    first: ['Jonas', 'Magnus', 'Kristian', 'Sander', 'Henrik', 'Ola', 'Erik', 'Martin', 'Fredrik', 'Sindre'],
    last: ['Hansen', 'Johansen', 'Olsen', 'Larsen', 'Andersen', 'Berg', 'Haugen', 'Bakken', 'Solberg', 'Dahl'],
  },
  SE: {
    first: ['Oscar', 'William', 'Elias', 'Hugo', 'Viktor', 'Anton', 'Isak', 'Albin', 'Gustav', 'Filip'],
    last: ['Andersson', 'Johansson', 'Karlsson', 'Nilsson', 'Eriksson', 'Larsson', 'Olsson', 'Persson', 'Svensson', 'Lindberg'],
  },
  CH: {
    first: ['Noah', 'Luca', 'Nico', 'Fabian', 'Silvan', 'Yann', 'Remo', 'Kevin', 'Simon', 'Cédric'],
    last: ['Müller', 'Meier', 'Schmid', 'Keller', 'Weber', 'Huber', 'Frei', 'Brunner', 'Baumann', 'Steiner'],
  },
  RO: {
    first: ['Andrei', 'Alexandru', 'Ionuț', 'Mihai', 'Florin', 'Răzvan', 'Cristian', 'Gabriel', 'Darius', 'Vlad'],
    last: ['Popescu', 'Ionescu', 'Popa', 'Stan', 'Dumitru', 'Constantin', 'Munteanu', 'Stoica', 'Matei', 'Marin'],
  },
  BG: {
    first: ['Georgi', 'Ivan', 'Dimitar', 'Nikolay', 'Petar', 'Martin', 'Kristian', 'Stoyan', 'Todor'],
    last: ['Ivanov', 'Georgiev', 'Dimitrov', 'Petrov', 'Nikolov', 'Hristov', 'Stoyanov', 'Todorov', 'Kolev'],
  },
  CY: {
    first: ['Andreas', 'Christos', 'Marios', 'Nikolas', 'Loizos', 'Kyriakos', 'Pieros'],
    last: ['Charalambous', 'Georgiou', 'Kyriakou', 'Ioannou', 'Antoniou', 'Panayiotou', 'Christodoulou'],
  },
  IL: {
    first: ['Itay', 'Omer', 'Eran', 'Dor', 'Liel', 'Yonatan', 'Tal', 'Gil'],
    last: ['Cohen', 'Levi', 'Mizrahi', 'Peretz', 'Biton', 'Dahan', 'Avraham', 'Friedman'],
  },
  BR: {
    first: ['Lucas', 'Gabriel', 'Matheus', 'Rafael', 'Felipe', 'Bruno', 'Thiago', 'Vinícius', 'Igor', 'Caio', 'Wesley'],
    last: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Costa', 'Carvalho', 'Almeida', 'Ribeiro', 'Gomes'],
  },
  NG: {
    first: ['Chinedu', 'Emeka', 'Samuel', 'David', 'Victor', 'Ahmed', 'Kelechi', 'Tochukwu', 'Ibrahim', 'Daniel'],
    last: ['Okafor', 'Eze', 'Adeyemi', 'Okonkwo', 'Bello', 'Nwosu', 'Musa', 'Olawale', 'Obi', 'Abubakar'],
  },
  GH: {
    first: ['Kwame', 'Kofi', 'Yaw', 'Kwabena', 'Emmanuel', 'Isaac', 'Samuel', 'Prince'],
    last: ['Mensah', 'Asante', 'Owusu', 'Boateng', 'Osei', 'Agyei', 'Appiah', 'Darko'],
  },
};

/** Ktoré cudzie národnosti sa objavujú v kádroch klubov danej krajiny (s váhami) */
export const FOREIGN_MIX: Record<string, Array<[string, number]>> = {
  CZ: [['SK', 30], ['UA', 10], ['NG', 8], ['PL', 6], ['HR', 6], ['RS', 6], ['BR', 4], ['GH', 6], ['AT', 3]],
  SK: [['CZ', 20], ['HU', 12], ['UA', 10], ['NG', 10], ['RS', 8], ['HR', 6], ['BR', 6], ['GH', 6], ['PL', 4]],
};
