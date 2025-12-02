we have most of the content mention below already, naming may differ a little from what you named it but i think you should be able to pick up what is what. This is an effort to simply the structure of our site. 3 reusable panels, top and botton nav buttons controls what info is shows on what panels, the app works mostly like it should but due to our panels/actions/buttons structure, it is extremely confusing and hard to build on. 

top nav buttons
profile -> opens your profile
memories -> opens your memories
pricing -> opens pricing options
social -> opens your followers/folliwing content

buttom nav buttons
1 theme changer (1 click change dark/light mode)
2 new memory pin (on click opens middel panel for new memory pin form)

left panel opens for
1 profile
reusable profile component for
->your profile (via the profile button in top nav)
->clicked person's profile
-> include stats like total followers, total following, memories placed etc.
-> make the following/followers clickable, if clicked open social panel for relevent person clicked

middel panel opens for 
1 new memory pin form
-> when you click the new memory pin button in the bottom nav

2 pricing
-> empty panel for pricing for now

right panel opens for
1 memories
->resuable memories copmponent that displays memories based on relevant user
->two tabs
-> tab 1 , placed memories by person
-> tab 2 , memories unlocked by person
-> both tabs has a search at the top that filters memories based on input

2 view memory // indivudal memory details
-> reusable memory component
-> show info relevant to memory clicked
(clicked from listed memories in memories panel, clicked from pin on map etc.)

3 clustered memories area clicked on map
-> shows a list of memories in that area
-> search bar to filter
-> clicking a memory opens memory view cotnent for that memory 

2 social 
->resuable social copmponent that displays folling and followers based on relevant user
-> two tabs
-> tab 1 , followers list
-> tab 2 , following list
-> both tabs has a search at the top that filters users based on input
->clicking on a person in following/followers tab should open profile in left panel but the info is for that person 


additional behaviour
-> back buttons on panels that changed
-> for instnace, clicking a a memory on the list of clustered memories panel, will bring up the memory view panel (which is also left panel) and in this case a back button should be added so that you can click back and go back to the clustered memories.










