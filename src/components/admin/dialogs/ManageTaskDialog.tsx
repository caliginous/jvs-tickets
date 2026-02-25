import { Dialog, Button } from "../../../ui";
import { OrderDeliveryInformationDetails, OrderPaymentInformationDetails } from "../OrderInformationDetails";
import { useEffect, useState } from "react";
import { getTaskType } from "../../../constants/orderValidation";
import axios from "axios";
import { PencilIcon } from "@heroicons/react/solid";

const STEP_ORDER = ["Payment", "Shipping", null];

export const ManageTaskDialog = ({task, onClose, categories}) => {
    const [taskType, setTaskType] = useState<null | "shipping" | "payment">(null);
    const [notesOpen, setNotesOpen] = useState(false);

    const updateState = async () => {
        try {
            const response = await axios.get("/api/admin/task/" + task.id);
            setTaskType(response.status === 404 ? null : getTaskType(response.data));
        }
        catch (e) {
            if (e.response.status !== 404) return;
            setTaskType(null)
        }
    }

    useEffect(() => {
        if (!task) return;
        setTaskType(getTaskType(task));
    }, [task]);

    if (task === null) return null;

    return (
        <>
            <Dialog open={true} onClose={onClose} size="lg">
                <Dialog.Header>
                    <h3 className="text-lg font-semibold">Manage Task</h3>
                </Dialog.Header>
                <Dialog.Body>
                    <div className="mb-6">
                        <div className="flex items-center justify-between">
                            {STEP_ORDER.map((label, index) => {
                                const isActive = taskType === null ? index === 2 : STEP_ORDER.findIndex((val) => val?.toLowerCase() === taskType) === index;
                                const isCompleted = taskType === null ? index <= 2 : STEP_ORDER.findIndex((val) => val?.toLowerCase() === taskType) > index;
                                
                                return (
                                    <div key={label} className="flex items-center">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                            isCompleted ? 'bg-green-500 text-white' : 
                                            isActive ? 'bg-blue-500 text-white' : 
                                            'bg-gray-200 text-gray-600'
                                        }`}>
                                            {isCompleted ? '✓' : index + 1}
                                        </div>
                                        <span className={`ml-2 text-sm font-medium ${
                                            isActive ? 'text-blue-600' : 
                                            isCompleted ? 'text-green-600' : 
                                            'text-gray-500'
                                        }`}>
                                            {label ?? "Finished"}
                                        </span>
                                        {index < STEP_ORDER.length - 1 && (
                                            <div className={`w-16 h-0.5 mx-4 ${
                                                isCompleted ? 'bg-green-500' : 'bg-gray-200'
                                            }`} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="border-t border-gray-200 my-4" />
                    {taskType === "payment" && (
                        <>
                            <p className="text-gray-700 mb-4">This task has not been marked as paid!</p>
                            <OrderPaymentInformationDetails
                                order={task.order}
                                onMarkAsPayed={updateState}
                            />
                        </>
                    )}
                    {taskType === "shipping" && (
                        <>
                            <p className="text-gray-700 mb-4">The tickets for this task need to be shipped!</p>
                            <OrderDeliveryInformationDetails
                                order={task.order}
                                onMarkAsShipped={updateState}
                            />
                        </>
                    )}
                    {!taskType && (
                        <>
                            <p className="text-gray-700 mb-4">This task has been completed!</p>
                        </>
                    )}
                </Dialog.Body>
                <Dialog.Footer>
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setNotesOpen(true)}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Add notes"
                        >
                            <PencilIcon className="w-5 h-5" />
                        </button>
                        <Button onClick={onClose} variant="outline">Close</Button>
                    </div>
                </Dialog.Footer>
            </Dialog>
            <NoteDialog task={task} onClose={() => setNotesOpen(false)} open={notesOpen} />
        </>
    );
};

const NoteDialog = ({task, onClose, open}) => {
    const [notes, setNotes] = useState([]);
    const [note, setNote] = useState("");

    useEffect(() => {
        setNotes(task?.notes ?? []);
        setNote("");
    }, [task]);

    const sendNote = async () => {
        const newNotes = Object.assign([], notes);
        newNotes.push(note);
        const response = await axios.put("/api/admin/task/" + task.id, {
            notes: newNotes
        });
        setNotes(response.data.notes);
    };

    return (
        <Dialog open={open} onClose={onClose} size="md">
            <Dialog.Header>
                <h3 className="text-lg font-semibold">Notes</h3>
            </Dialog.Header>
            <Dialog.Body>
                {notes.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No notes available yet!</p>
                ) : (
                    <div className="space-y-2 mb-4">
                        {notes.map((note, index) => (
                            <div key={index} className="p-3 bg-gray-50 rounded-lg">
                                <span className="text-sm text-gray-600">{(index + 1)}. {note}</span>
                            </div>
                        ))}
                    </div>
                )}
                <div className="flex space-x-2">
                    <input
                        type="text"
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        placeholder="Add a note..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <Button
                        onClick={sendNote}
                        variant="solid"
                        size="sm"
                        disabled={!note.trim()}
                    >
                        Send
                    </Button>
                </div>
            </Dialog.Body>
        </Dialog>
    )
};
