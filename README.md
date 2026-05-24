Inspiration
Natural disasters create zones of offline areas, this leaves gaps in communication. This leaves volunteers in the dark. To fix this we created an all in one solution of both offline communication app and a volunteer side that uses AI to assign tasks based on volunteer expertise. Working together to get victims the support they need.

What it does
The most complex part of our app is the offline no wifi communication, our app uses BLE to transmit packets of data to computers which can then send the data to other computers like a relay station. Our app communicates like TCP, not double checking if packets are sent, this is to save time as BLE can't transmit large packets all at once. So rechecking constantly if packets are sent (such as with UDP) isn't effienct. Along with that we use algorithms to make sure our path from one computer to another is as fast as possible, (the best possible path).

How we built it
We built the program with Nextjs and javascript for frontend and backend. Then we used firebase for storage.

Challenges we ran into
Offline connection between multiple computers.

Accomplishments that we're proud of
Fast and accurate offline communication.

What we learned
BLE and how the internet works.

What's next for RescuLink
Better offline communication.
