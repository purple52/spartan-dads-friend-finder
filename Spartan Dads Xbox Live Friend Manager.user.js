// ==UserScript==
// @name         Spartan Dads Xbox Live Friend Manager
// @namespace    https://github.com/purple52/spartan-dads-friend-finder
// @version      0.13.2017-06-01
// @updateURL    https://github.com/purple52/spartan-dads-friend-finder/raw/master/Spartan%20Dads%20Xbox%20Live%20Friend%20Manager.user.js
// @downloadURL  https://github.com/purple52/spartan-dads-friend-finder/raw/master/Spartan%20Dads%20Xbox%20Live%20Friend%20Manager.user.js
// @description  Script to fetch all existing friends, and compare that list to the list of all Spartan Dads, and add the members not listed in your friends list.
// @author       Vuris, WinkSomeIDunno and PurpleFiftyTwo
// @match        https://account.xbox.com/*
// @match        https://www.halowaypoint.com/en-us/spartan-companies/*
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js
// @user-agent   Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.111 Safari/537.36
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// ==/UserScript==
/* jshint -W097 */
'use strict';


/*
 * Here's a basic description of the flow of this little script: Excuse some of
 * my JS and variable naming. This was originally just for managing the Spartan
 * Dads group. It has since expanded
 *
 * When a user visits their friends URL
 * (https://account.xbox.com/en-US/Friends), and they have an IMPORT variable
 * appended (https://account.xbox.com/en-US/Friends?xr=socialtwistnav&IMPORT) we
 * will detect that case, and start a process of importing the spartan companies
 * listed in this file into their friends list, as best as we can.
 *
 * Specifically, we'll first set a session variable of the companies to process
 * (can be a single company, can be dozens) Once that is set, we'll come back to
 * the same friends url
 * (https://account.xbox.com/en-US/Friends?xr=socialtwistnav) without the IMPORT
 * flag.
 *
 * Since we don't trigger the IMPORT logic, we check to see if there are any
 * spartan companies in that session variable, and take the first one and send
 * this browser window out to go get those GamerTags. Once we have those gamer
 * tags, we add them to another session variable and then we'll remove that
 * spartan company from the list (or set it to be empty if this is the last or
 * only one) and send them back to the friends url.
 *
 * If there are more spartan compaies to check, that session variable will still
 * have things to do, so the above logic will run. If, instead, we've managed to
 * create a list of all of those GamerTags we want to add to our friends list,
 * we will sort that list, and then fetch the list of our existing friends so we
 * can compare. Still on the same page load, we run that comparison and create a
 * new session variable of our ToDo list, which is the listing of just the
 * company members who are not already in our friends list.
 *
 * At this point, we'll redirect back to our current friends page, but we'll now
 * have the ToDo list set in the session variable. If that variable is set,
 * we'll take the first name in that list, and ship the user to that particular
 * GamerTag page.
 *
 * When we arrive at a GamerTag page, we're going to check to see if we have the
 * ToDo list variable set. if we do, we know that we need to set this person to
 * be a friend. If it is not set, this is just someone navigating GamerTags, and
 * we shouldn't automatically add them as a friend. We will wait until the page
 * loads, compare the GamerTag to the logged-in username, and if they are
 * different, it will add the GamerTag as your friend for you. Once that's
 * accomplished, it will remove that GamerTag from the ToDo list and forward us
 * back to the friends page. Once there, we'll be able to handle situations
 * where the add didn't happen because of lag, or whatever, in that we'll send
 * the page back to the same URL if necessary, until that user is successfully
 * confirmed as a friend.
 *
 * Coming back to the overall friends list, we detect that we still have a ToDo
 * list, so we take the first one in line and send the page back out. This
 * happens over and over until there are no more GamerTags to process.
 *
 * If you come to the friends page, or to the waypoint pages, if the variables
 * haven't been set, and you're not explicitly starting a new import, nothing
 * should happen. Once you start an import, leave the browser alone until it is
 * finished. If there is an issue, where the site hangs on a particular
 * GamerTag, we may need to explicitly edit the script below by enabling the
 * problemName declaration and removing that specific GamerTag. If the system is
 * stuck somewhere else, you can always reset all the variables to clear (not
 * importing) by visting the clean spot:
 * (https://account.xbox.com/en-US/Friends?xr=socialtwistnav&CLEANME)
 *
 * Any questions or concerns drop me a line in XBox Live. In fact, I'd love to
 * hear from anyone who finds this useful. I'm Vuris.
 *
 * Here are the declarations for your company and for you specifically. All
 * changes should be made here. If you have more than one spartan company, or
 * more than one GamerTag you need to skip, just copy and paste over and over.
 *
 */

var targetCompanies = [];
targetCompanies.push("spartan%20dads");
targetCompanies.push("spartan%20dads%202");
targetCompanies.push("spartan%20dads%203");
targetCompanies.push("spartan%20dads%204");
targetCompanies.push("undivided");
targetCompanies.push("C%20You%20Next%20Tuesday");


var skipGamerTags = [];
// skipGamerTags.push = "SOMEGAMERTAG";

var debug=true;
// set to true if you're trying to debug the system for some reason



/*
 * Really not much I'd suggest editing here unless you're changing some
 * functionality, in which case, I'd love to get a copy of what you do, so I can
 * continue to keep this updated as best as we can.
 *
 */


if (debug){
    console.log('The Spartan Company to XBox Live Friend Manager script has been instantiated');
}
/*
 * remember, we're only triggered when we're within the matches above (I've
 * defanged these matches to avoid any conflicts, but keep them accurate) match
 * https://account.xbox.com/* match
 * https://www.halowaypoint.com/en-us/spartan-companies/*
 *
 * so now there are only two urls we care about, so if we're not at one of
 * those, lets ignore https://account.xbox.com/en-US/Friends (with variables and
 * switches) and https://www.halowaypoint.com/en-us/spartan-companies/* At this
 * time, to avoid any further issues with internationalization, we'll table this
 * filter for now.
 */

// get out of ajax call
var meCheck = window.location.href.indexOf("UserDataMeControl");
if (meCheck!=-1){
    if(debug){
        console.log('Not running on the ajax/message call.');
        return;
    }
}

// default page to clean up and base all of our actions from. Might need to
// detect internationalization here. TODO
var linkToFollow='https://account.xbox.com/en-US/Friends?xr=socialtwistnav';

// Cleanup if necessary. This does not restart the import. This is to get
// everything to be reset.
var cleanCheck = window.location.href.indexOf("CLEANME");
if(cleanCheck !=-1){
    if(debug){
        console.log('Cleaning toDoString, companiesToDoString, memberListString and myUsername session values.');
    }
    GM_deleteValue("toDoString");
    GM_deleteValue("companiesToDoString");
    GM_deleteValue("memberListString");
    GM_deleteValue("myUsername");
    if(debug){
        console.log('Redirecting to : ' + linkToFollow);
    }
    window.location.href=linkToFollow;
    return;
}


var listCheck = window.location.href.indexOf("Friends?");
// are we on the friends page?
if (listCheck!=-1){
    if(debug){
        console.log('We are on the Friends page.');
    }
    // Do we have a list of company members we have processed and are iterating
	// through?
    var toDoString = GM_getValue("toDoString", 0);
    if (!toDoString){
        // lets check to see if we're starting things up
        if(debug){
            console.log('We do not have a current toDo string to iterate through.');
        }
        var importCheck = window.location.href.indexOf("IMPORT");
        if (importCheck!=-1){
            if(debug){
                console.log('We have detected the IMPORT variable kicking off a new sync action on the friends page.');
            }
            // we're kicking things off, so lets set the list of companies we
			// want to index in the session variable
            var companiesToDoString=JSON.stringify(targetCompanies);
            GM_setValue("companiesToDoString", companiesToDoString);
            // next time we come around, we'll have that variable of companies
			// to process waiting for us.
            if(debug){
                console.log('We have set the following string of companies to process : '+ companiesToDoString + ' and are now redirecting to ' + linkToFollow);
            }
            window.location.href=linkToFollow;
            return;
        }
        // so we weren't kicking off, so lets check to see if we have a list of
		// companies to process
        var companiesToDoString=GM_getValue("companiesToDoString",0);
        if (companiesToDoString){
            if(debug){
                console.log('We have detected the companiesToDo string in the session, so we know we need to process those companies members.');
            }
            var companiesToDo=JSON.parse(companiesToDoString);
            if (companiesToDo.length>=1){
                var targetCompany = companiesToDo[0];
                // go get that spartan company and add them to the list of all
				// members.
                if(debug){
                    console.log('We have detected there is a value within that string for a company to process, so we are now visiting : http://halowaypoint.com/en-us/spartan-companies/' + targetCompany);
                }
                window.location.href = 'http://halowaypoint.com/en-us/spartan-companies/' + targetCompany;
                return;
            } else {
                if(debug){
                    console.log('We have detected there are no further companies to process, so we will unset that variable and head back to : ' + linkToFollow);
                }
                GM_deleteValue("companiesToDo");
                window.location.href=linkToFollow;
                return;
            }
        }
        // At this point, because we haven't stopped processing based on a
		// return, we know that we're on the friends page, and we do not have a
		// list of companies to process.
        var memberListString=GM_getValue("memberListString",0);
        if (memberListString){
            if(debug){
                console.log('We have detected the memberListString string in the session, and we know that there are no more spartan companies to process, so we are ready to get the friends list and compare.');
            }
            // So we've got the list of all folks in the companies and we've
			// just sorted them, so lets get all the friends and
            // compare the two lists and set our toDo list.
            var memberList = JSON.parse(memberListString);
            memberList.sort();
            // First, lets add the folks who we are having issues with.
            var currentFriends = skipGamerTags;
            if(currentFriends.length>0){
            	if(debug){
            		console.log('We have detected at least one skip gamer directive.  All skipped gamer tags are in the array below.');
            		console.dir(currentFriends);
            	}
            }
            var friendsContent = document.getElementById('friendsContent');
            var personListWrapper = friendsContent.getElementsByClassName('personListWrapper');
            var gamerList = personListWrapper[0].getElementsByClassName('gamerList');
            var ul = gamerList[0].getElementsByTagName('ul');
            var gamerItems = ul[0].getElementsByTagName('li');
 
            for (var i = 0; i < gamerItems.length; ++i) {
                if(debug){
                    console.log('We have found GamerTag ' + gamerItems[i].dataset.gamertag + ' in the Friends list, and are adding that to our array to compare.');
                }
                currentFriends.push(gamerItems[i].dataset.gamertag);
            }
            currentFriends.sort();
            // So now we have all the company members in a list, and we have all
			// the current friends in another list.
            // So lets compare the two and make a todo list of all the company
			// members not in the current friends list.
            var toDo=[];
            memberList.forEach(function(member){
                if(debug){
                    console.log('We are checking to see if ' + member + ' is currently in our friends list.');
                }
                var index = currentFriends.indexOf(member);
                if(index<0){
                    if(debug){
                        console.log(member + ' needs to be added to our friends list (the toDo list)');
                    }
                    toDo.push(member);
                } else {
                    if(debug){
                        console.log(member + ' is currently in our friends list and does not need to be added.');
                    }
                }
            });
            // so now we have the toDo array of all GamerTags in the companies
			// that are not in the current friends.
            GM_setValue("toDoString", JSON.stringify(toDo));
            if(debug){
                console.log('The toDoString session variable has been set to be ' + JSON.stringify(toDo));
            }
            // this means that we can now unset the sdList
            GM_deleteValue("memberListString");
            if(debug){
                console.log('We no longer need the list of members, since we have created a list of only those members we need to add, so we are deleting the memberListString session variable, and redirecting to ' + linkToFollow);
            }
            // since we've now gotten the toDo string, we should swing back
			// around and trigger that. Simpler than trying to get into the next
			// logical fork manually.
            window.location.href=linkToFollow;
            return;
        }

        /*
		 * At this point, because we haven't stopped processing based on a
		 * return, we know that we're on the friends page, and we do not have a
		 * list of companies to process, and we do not have a list of members to
		 * process, and we're in a larger condition of the toDo string not being
		 * set, we're safe to now assume that this person isn't in any
		 * particular step of the import, so leave their browsning alone
		 */
        if(debug){
            console.log('We are on the friends page, and no triggers, either in the URL or in the session variables, were found at this time, so we will not continue processing.');
        }
        return;
    } else {
        if(debug){
            console.log('We are on the friends page, and the toDoString has been detected.');
        }
        toDo = JSON.parse(toDoString);
        if (toDo.length <= 0){
            if(debug){
                console.log('We ahave detected that the ToDo array is now empty, so unsetting the variable and exiting.');
            }
            GM_deleteValue("toDoString");
            return;
        }
        if(debug){
            console.log('We are on the friends page, and the toDoString has been detected.  We are now heading off to https://account.xbox.com/en-US/Profile?GamerTag=' + toDo[0]); 
        }
        window.location.href ="https://account.xbox.com/en-US/Profile?GamerTag=" + toDo[0];
        return;
    }
} // closing the friends page processing chunk

var waypointCheck = window.location.href.indexOf("spartan-companies");
// are we on Halo Waypoint?
if (waypointCheck!=-1){
    if(debug){
        console.log('We are on a Halo Waypoint Spartan Company page.');
    }
    // now we need to check to make sure that we're fetching spartan companies,
	// so a quick confirmation that the variable holding those names will be
	// sufficient now
    var companiesToDoString = GM_getValue("companiesToDoString",0);
    if (companiesToDoString){
    	var companiesToDo = JSON.parse(companiesToDoString);
        // now that we know we have confirmed we're mid-process, lets fetch the
		// existing list of members to append this list to
        var memberListString=GM_getValue("memberListString",0);
        if (!memberListString){
            if(debug){
               console.log('We do not have any current members in our session list.');
            }
            var memberList = [];
        } else {
            var memberList = JSON.parse(memberListString);
            if(debug){
               console.log('We have found a list of members we are adding to.  Before adding this company, we have ' + memberList.length + ' members.');
            }
        }
        $('.clan-member-list li').each(function(){
        	memberList.push($(this).children('.gamertag.text--medium.case-sensitive').text())
        	if(debug){
        		console.log('Adding member ' + $(this).children('.gamertag.text--medium.case-sensitive').text() + ' to the list of members.');
        	}
        });
        // we are now finished with all members and have added them to the list
        if(debug){
            console.log('After adding this company, we now have ' + memberList.length + ' members.');
         }
        // So now we need to write those members into that string
        if(memberList.length>0){
        	GM_setValue("memberListString",JSON.stringify(memberList));
        	if(debug){
                console.log('Writing the memberListString to session variable');
                console.log(JSON.stringify(memberList));
             }
        }

        // now we need to cleanup the companiesToDo
        companiesToDo.shift();
        if(companiesToDo.length>0){
        	if(debug){
                console.log('We still have ' + companiesToDo.length + ' companies to process.');
             }
            GM_setValue("companiesToDoString", JSON.stringify(companiesToDo));
        } else {
        	if(debug){
                console.log('We have no more companies to process.  Removing the companiesToDoString session variable.');
             }
        	GM_deleteValue("companiesToDoString");
        }
        // all processed pages send us back to the main friends page (for now)
        if(debug){
            console.log('We have detected we are finished with this spartan company and are heading back to : ' + linkToFollow);
        }
        window.location.href=linkToFollow;
        return;
    } else {
        if(debug){
            console.log('We are on a Halo Waypoint Spartan Company page, but we have no companies to process, so we will stop running now.');
        }
    }
}  // closing the Waypoint chunk

var profileCheck = window.location.href.indexOf("Profile?GamerTag");
if (profileCheck!=-1){
	if(debug){
        console.log('We are on a member profile page.');
    }
	var toDoString = GM_getValue("toDoString",0);
    if (!toDoString){
    	if(debug){
            console.log('We are on a Halo Waypoint Spartan Company page, but we do not have a toDoString in the session, so just visiting');
        }
        return;
    }
    if(document.getElementById('addFriend')){
    	if(debug){
            console.log('We did find the "addFriend" ID.  Waiting on the message delivery.');
    	}
    } else {
    	if(debug){
            console.log('We did not find the "addFriend" ID, so we may be blocked.  Removing this member from the list and continuing.');
    	}
        toDo = JSON.parse(toDoString);
        toDo.shift()
        GM_setValue('toDoString', JSON.stringify(toDo));
        window.location.href=linkToFollow;
        return;
    }
    window.addEventListener('message',function(event) {
        function triggerMouseEvent (node, eventType) {
            var clickEvent = document.createEvent ('MouseEvents');
            clickEvent.initEvent (eventType, true, true);
            node.dispatchEvent (clickEvent);
        }
        if (document.getElementById('friendOperation')) {
            if (debug) {
                console.log('Gamer is already a friend. Heading back to ' + linkToFollow);
            }
        } else {
            var addFriendButton = document.getElementById('addFriend');
            if (addFriendButton) {
                triggerMouseEvent (addFriendButton, "click");
                setTimeout(function(){
                    var button = document.getElementById('addFriend');
                    if(button && !(button.offsetHeight === 0 && button.offsetWidth === 0)){
                        window.location.reload();
                        return;
                    } else {
                        if(debug){
                            console.log('The message was delivered and we successfully added this profile as a friend.  Heading back to ' + linkToFollow);
                        }
                        toDo = JSON.parse(toDoString);
                        toDo.shift();
                        GM_setValue('toDoString', JSON.stringify(toDo));
                        window.location.href=linkToFollow;
                        return;
                    }
                },1000)
            } else {
                console.log ("addFriend element not found!");
            }
        }
    },false);
}  // closing the profile chunk

// Just in case we're looking at a URL that matches, but didn't fully qualify
// for the target URLS.
if(debug){
    console.log('We are on a page that qualifies under the match, but is not a target URL for this process.');
}
return;

