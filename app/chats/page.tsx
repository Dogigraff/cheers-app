import { MessageSquare } from "lucide-react";

export default function ChatsPage() {
    return (
        <div className="min-h-screen bg-zinc-950 text-white">
            <div className="max-w-md mx-auto px-4 pt-12 pb-8">
                <h1 className="text-2xl font-bold mb-1">My Chats</h1>
                <p className="text-sm text-zinc-500 mb-8">Your active beacons & conversations</p>

                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 rounded-full bg-zinc-800/60 flex items-center justify-center mb-4">
                        <MessageSquare className="w-7 h-7 text-zinc-600" />
                    </div>
                    <p className="text-zinc-400 font-medium mb-1">No active chats yet</p>
                    <p className="text-sm text-zinc-600">
                        Light a beacon on the map to start connecting
                    </p>
                </div>
            </div>
        </div>
    );
}
