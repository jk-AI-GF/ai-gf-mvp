// src/renderer/components/SequenceEditor/CommentNode.tsx

import React, { useCallback, useRef } from 'react';
import { NodeProps, useReactFlow } from 'reactflow';
import { CommentNodeModel } from '../../../core/sequence/CommentNodeModel';

const CommentNode: React.FC<NodeProps<CommentNodeModel>> = ({ id, data, selected }) => {
    const { setNodes, getNode } = useReactFlow();
    const nodeRef = useRef<HTMLDivElement>(null);

    const onChange = useCallback((evt: React.ChangeEvent<HTMLTextAreaElement>) => {
        data.comment = evt.target.value;
    }, [data]);

    const onResizeStart = useCallback((event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();

        const node = getNode(id);
        const nodeElement = nodeRef.current;
        if (!node || !nodeElement) return;

        const startWidth = nodeElement.offsetWidth;
        const startHeight = nodeElement.offsetHeight;
        const startX = event.clientX;
        const startY = event.clientY;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const newWidth = startWidth + (moveEvent.clientX - startX);
            const newHeight = startHeight + (moveEvent.clientY - startY);
            // Directly manipulate the DOM for performance during resize
            nodeElement.style.width = `${Math.max(newWidth, 100)}px`;
            nodeElement.style.height = `${Math.max(newHeight, 50)}px`;
        };

        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);

            // Update the React Flow state only once on mouse up
            setNodes((nodes) =>
                nodes.map((n) => {
                    if (n.id === id) {
                        return {
                            ...n,
                            style: {
                                ...n.style,
                                width: nodeElement.offsetWidth,
                                height: nodeElement.offsetHeight,
                            },
                        };
                    }
                    return n;
                })
            );
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);

    }, [id, getNode, setNodes]);

    return (
        <div
            ref={nodeRef}
            style={{
                background: selected ? '#5a5a5a' : '#4E4E4E',
                border: selected ? '1px solid #888' : '1px solid #666',
                borderRadius: '5px',
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
                position: 'relative',
            }}
            className="nowheel"
        >
            <textarea
                defaultValue={data.comment}
                onChange={onChange}
                style={{
                    width: '100%',
                    height: '100%',
                    padding: '10px',
                    border: 'none',
                    background: 'transparent',
                    color: 'white',
                    resize: 'none',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                }}
                placeholder="여기에 주석을 입력하세요..."
            />
            <div
                onMouseDown={onResizeStart}
                style={{
                    position: 'absolute',
                    right: 0,
                    bottom: 0,
                    width: '15px',
                    height: '15px',
                    cursor: 'se-resize',
                    borderRight: '2px solid #aaa',
                    borderBottom: '2px solid #aaa',
                }}
                className="nodrag"
            />
        </div>
    );
};

export default CommentNode;
